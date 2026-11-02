/**
 * Where fixes come from while a voyage is live.
 *
 * - `gps`: expo-location in the foreground. Works in Expo Go. Tracking pauses
 *   if the phone locks or the app is backgrounded; background tracking needs
 *   a development build and lands in the Phase 0 spike (SCOPE §10).
 * - `sim`: a boat doing ~9 kn from the last known position, one simulated
 *   minute per real second, for testing at a desk.
 */
import * as Location from 'expo-location';

import { destination, fmtLatLon, type LatLon } from '@/domain/geo';
import type { Fix } from '@/domain/track';

export type FeedSource = 'gps' | 'sim';
export type Stop = () => void;

/** Requests permission and starts the GPS. Throws a user-facing message if location is off or refused. */
export async function startGps(onFix: (f: Fix) => void): Promise<Stop> {
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('Location Services are off. Turn them on in Settings.');
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('YachtPA needs location access to track a voyage.');
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 15000 },
    (loc) => onFix({ ts: loc.timestamp, lat: loc.coords.latitude, lon: loc.coords.longitude, accuracy: loc.coords.accuracy }),
  );
  return () => sub.remove();
}

const SIM_TICK_MS = 1000;
const DEFAULT_START: LatLon = { lat: -20.155, lon: 57.49 }; // Port Louis

/** `startedAt` anchors simulated time so a resumed simulation carries on where it left off. */
export function startSim(onFix: (f: Fix) => void, from: LatLon | null, startedAt: number, resumeAt?: Fix | null): Stop {
  let pos = resumeAt ?? from ?? DEFAULT_START;
  let minute = resumeAt ? Math.round((resumeAt.ts - startedAt) / 60000) : 0;
  let heading = 200;
  if (!resumeAt) onFix({ ts: startedAt, lat: pos.lat, lon: pos.lon, accuracy: 6 });
  const id = setInterval(() => {
    minute += 1;
    heading += Math.sin(minute / 9) * 4;
    const kn = 9 + 2 * Math.sin(minute / 5);
    pos = destination(pos, heading, kn / 60);
    onFix({ ts: startedAt + minute * 60000, lat: pos.lat, lon: pos.lon, accuracy: 6 });
  }, SIM_TICK_MS);
  return () => clearInterval(id);
}

/** A place name for a position: town or marina when online, coordinates when not. */
export async function placeName(p: LatLon): Promise<string> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lon });
    const name = a?.city ?? a?.district ?? a?.subregion ?? a?.region ?? a?.name;
    if (name) return name;
  } catch {
    // Offline or rate-limited: fall through to coordinates.
  }
  return fmtLatLon(p);
}
