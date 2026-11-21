/**
 * Voyage position feed. Location is only ever collected between START and
 * STOP (SCOPE §12).
 *
 * Three modes, chosen at START:
 * - background: expo-location background updates into a TaskManager task. Needs a
 *   development build and "Always" permission. The real thing.
 * - foreground: watchPositionAsync while the app is open. Expo Go, or when the user
 *   declined "Always". The live screen tells them to keep the app open.
 * - simulated: a scripted Port Louis → Black River run on an accelerated clock (one
 *   minute per second). Web, and the "Simulated GPS" demo setting.
 *
 * Every mode writes fixes to the same track_point table, so the voyage maths
 * cannot tell them apart.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { addTrackPoints, getKv, setKv } from '@/db/repo';
import type { Fix } from '@/domain/types';

export const LOCATION_TASK = 'yachtpa-voyage-location';

export type TrackingMode = 'background' | 'foreground' | 'simulated';
export type TrackingState = { voyageId: string; mode: TrackingMode; startedAt: number };

const KEY = 'tracking';

export function trackingState(): TrackingState | null {
  const raw = getKv(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrackingState;
  } catch {
    return null;
  }
}

function toFix(l: Location.LocationObject): Fix {
  return {
    ts: l.timestamp,
    lat: l.coords.latitude,
    lon: l.coords.longitude,
    accuracy: l.coords.accuracy ?? null,
    speed: l.coords.speed !== null && l.coords.speed >= 0 ? l.coords.speed : null,
  };
}

// Defined at module load, as TaskManager requires, so it exists when the OS wakes the app.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const s = trackingState();
    if (!s) return;
    addTrackPoints(s.voyageId, data.locations.map(toFix));
  });
}

/* ---------- foreground and simulated feeds (module-level, one at a time) ---------- */

let watch: Location.LocationSubscription | null = null;
let sim: ReturnType<typeof setInterval> | null = null;

/** Port Louis harbour mouth → Black River, roughly following the coast. */
const SIM_ROUTE: [number, number][] = [
  [-20.155, 57.495],
  [-20.17, 57.47],
  [-20.2, 57.44],
  [-20.25, 57.41],
  [-20.3, 57.385],
  [-20.345, 57.365],
  [-20.36, 57.367],
];

function simPosition(min: number): { lat: number; lon: number; kn: number } {
  // ~10 kn with a gentle swell in speed, after 3 minutes of slow manoeuvring.
  const kn = min < 3 ? 0.4 : 9.6 + 2.2 * Math.sin(min / 2.4);
  let nm = 0;
  for (let m = 3; m < min; m++) nm += 9.6 + 2.2 * Math.sin(m / 2.4);
  nm /= 60;
  let left = nm;
  for (let i = 1; i < SIM_ROUTE.length; i++) {
    const [a, b] = [SIM_ROUTE[i - 1], SIM_ROUTE[i]];
    const leg = Math.hypot((b[0] - a[0]) * 60, (b[1] - a[1]) * 60 * Math.cos((a[0] * Math.PI) / 180));
    if (left <= leg) {
      const f = left / leg;
      return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, kn };
    }
    left -= leg;
  }
  const end = SIM_ROUTE[SIM_ROUTE.length - 1];
  return { lat: end[0], lon: end[1], kn: 0 };
}

function startSim(s: TrackingState) {
  stopFeeds();
  const startMin = Math.floor((Date.now() - s.startedAt) / 60_000);
  let min = getKv('sim_min') ? Number(getKv('sim_min')) : startMin;
  const step = () => {
    const p = simPosition(min);
    addTrackPoints(s.voyageId, [{ ts: s.startedAt + min * 60_000, lat: p.lat, lon: p.lon, accuracy: 8, speed: p.kn / 1.943844 }]);
    setKv('sim_min', String(min));
    min++;
  };
  step();
  sim = setInterval(step, 1000);
}

async function startWatch(s: TrackingState) {
  stopFeeds();
  watch = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 30_000, distanceInterval: 0 },
    (l) => addTrackPoints(s.voyageId, [toFix(l)]),
  );
}

function stopFeeds() {
  watch?.remove();
  watch = null;
  if (sim) clearInterval(sim);
  sim = null;
}

/* ---------- public API ---------- */

export type StartResult = { ok: true; mode: TrackingMode } | { ok: false; reason: string };

/** Asks for permission and picks the best mode this device allows. */
export async function chooseMode(simulated: boolean): Promise<StartResult> {
  if (simulated || Platform.OS === 'web') return { ok: true, mode: 'simulated' };
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: 'Location permission is off. Turn it on in Settings to track voyages.' };
  try {
    const bgAvailable = (await TaskManager.isAvailableAsync()) && (await Location.isBackgroundLocationAvailableAsync());
    if (bgAvailable) {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status === 'granted') return { ok: true, mode: 'background' };
    }
  } catch {
    // Expo Go: background location is not available. Fall through to foreground.
  }
  return { ok: true, mode: 'foreground' };
}

/** Starts the feed. Falls back to foreground if background updates refuse to start (e.g. Expo Go). */
export async function startTracking(voyageId: string, mode: TrackingMode, startedAt: number): Promise<TrackingMode> {
  const s: TrackingState = { voyageId, mode, startedAt };
  setKv(KEY, JSON.stringify(s));
  setKv('sim_min', null);
  try {
    await resume(s);
    return mode;
  } catch (e) {
    if (mode !== 'background') throw e;
    const fg: TrackingState = { ...s, mode: 'foreground' };
    setKv(KEY, JSON.stringify(fg));
    await resume(fg);
    return 'foreground';
  }
}

/** Restarts the feed after an app relaunch while a voyage is live. */
export async function resume(s: TrackingState | null = trackingState()) {
  if (!s) return;
  if (s.mode === 'simulated') return startSim(s);
  if (s.mode === 'foreground') return startWatch(s);
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    // Boats are slow: one fix every 30 s is accurate enough and kind to the battery (SCOPE §4.2).
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,
    distanceInterval: 0,
    deferredUpdatesInterval: 60_000,
    activityType: Location.ActivityType.OtherNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Voyage underway',
      notificationBody: 'YachtPA is logging your track. Stop the voyage to end tracking.',
      killServiceOnDestroy: false,
    },
  });
}

/** Stops every feed. Returns the simulated clock's end time, if simulated. */
export async function stopTracking(): Promise<number | null> {
  const s = trackingState();
  stopFeeds();
  let simEnd: number | null = null;
  if (s?.mode === 'simulated') {
    const min = Number(getKv('sim_min') ?? 0);
    simEnd = s.startedAt + min * 60_000;
  }
  if (s?.mode === 'background' && Platform.OS !== 'web') {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch {
      // Already stopped by the OS.
    }
  }
  setKv(KEY, null);
  setKv('sim_min', null);
  return simEnd;
}

/** "Now" for a live voyage: wall clock, or the simulated clock when simulating. */
export function liveNow(s: TrackingState | null): number {
  if (s?.mode === 'simulated') {
    const min = Number(getKv('sim_min') ?? 0);
    return s.startedAt + min * 60_000;
  }
  return Date.now();
}
