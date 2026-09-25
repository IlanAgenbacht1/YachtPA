/**
 * Start and stop background position updates for the live voyage.
 * Interval and distance are the spike's first knobs (docs/SPIKE_GPS.md).
 */
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { VOYAGE_TASK } from './task';

export type PermissionOutcome = 'always' | 'while-in-use' | 'denied' | 'unavailable';

/** Asks for foreground, then background location. Android and iOS both require that order. */
export async function requestTrackingPermission(): Promise<PermissionOutcome> {
  if (Platform.OS === 'web') return 'unavailable';
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'always' : 'while-in-use';
}

export async function getTrackingPermission(): Promise<PermissionOutcome> {
  if (Platform.OS === 'web') return 'unavailable';
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'always' : 'while-in-use';
}

export const TRACKING_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  /** Boats are slow: one fix every 30 s is plenty and kind to the battery. */
  timeInterval: 30_000,
  distanceInterval: 25,
  /** iOS: hand fixes over in batches when in the background. */
  deferredUpdatesInterval: 60_000,
  deferredUpdatesDistance: 50,
  pausesUpdatesAutomatically: false,
  activityType: Location.ActivityType.OtherNavigation,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'YachtPA is logging your voyage',
    notificationBody: 'Tracking stops when you tap Stop voyage.',
    notificationColor: '#D2481F',
    killServiceOnDestroy: false,
  },
};

export async function startTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(VOYAGE_TASK)) return;
  await Location.startLocationUpdatesAsync(VOYAGE_TASK, TRACKING_OPTIONS);
}

export async function stopTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(VOYAGE_TASK)) {
    await Location.stopLocationUpdatesAsync(VOYAGE_TASK);
  }
}

export async function isTracking(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(VOYAGE_TASK);
}
