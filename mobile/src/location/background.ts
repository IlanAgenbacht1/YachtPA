/**
 * Tracking with the phone locked (SCOPE §4.1, M3).
 *
 * A TaskManager task receives fixes from the OS and writes them straight to
 * SQLite against the live voyage, so nothing is lost if the UI is asleep.
 * While the app is open, the store also hears each fix through `onFix`.
 *
 * Expo Go cannot run background tasks, so there (and when the user declines
 * "Always") tracking falls back to the foreground watch in `feed.ts`.
 *
 * This module must be imported at app start-up (root `_layout.tsx`) so the
 * task is defined before the OS delivers fixes after a relaunch.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { addFix, getLiveVoyage } from '@/db/repo';
import type { Fix } from '@/domain/track';

export const VOYAGE_TASK = 'yachtpa-voyage-track';

type Listener = (voyageId: string, f: Fix) => void;
let listener: Listener | null = null;
let cachedVoyageId: string | null = null;

export function setBackgroundListener(l: Listener | null) {
  listener = l;
}

/** Background tasks need a real build; Expo Go and the browser cannot. */
export function backgroundSupported(): boolean {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

if (backgroundSupported()) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(VOYAGE_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    if (!cachedVoyageId) cachedVoyageId = (await getLiveVoyage())?.id ?? null;
    const id = cachedVoyageId;
    if (!id) return;
    for (const loc of data.locations) {
      const f: Fix = { ts: loc.timestamp, lat: loc.coords.latitude, lon: loc.coords.longitude, accuracy: loc.coords.accuracy };
      await addFix(id, f);
      listener?.(id, f);
    }
  });
}

/**
 * Starts background updates for `voyageId`. Returns false (and starts nothing)
 * if "Always" was not granted, so the caller can fall back to the foreground.
 */
export async function startBackground(voyageId: string): Promise<boolean> {
  if (!backgroundSupported()) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return false;
  cachedVoyageId = voyageId;
  await Location.startLocationUpdatesAsync(VOYAGE_TASK, {
    accuracy: Location.Accuracy.High,
    // Boats are slow: a fix every ~10 m or 15 s is plenty and saves battery (SCOPE §4.2).
    distanceInterval: 10,
    timeInterval: 15000,
    activityType: Location.LocationActivityType.OtherNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Voyage underway',
      notificationBody: 'YachtPA is logging your track.',
      killServiceOnDestroy: false,
    },
  });
  return true;
}

export async function stopBackground(): Promise<void> {
  cachedVoyageId = null;
  if (!backgroundSupported()) return;
  if (await Location.hasStartedLocationUpdatesAsync(VOYAGE_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(VOYAGE_TASK);
  }
}
