/**
 * Everything a phone needs so a voyage is logged with the phone in a pocket,
 * checked and fixed in one place (the Tracking setup screen).
 *
 * Android 11+ never offers "Allow all the time" in the pop-up: asking for it
 * opens the app's location page in Settings, where the user picks it. iOS
 * asks "Always" in a second pop-up. Approximate location is useless for
 * logging miles (every fix is thrown away as too inaccurate), so precise is
 * checked too.
 */
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import { backgroundSupported } from './background';

export type TrackingStatus = {
  /** the phone's location switch */
  services: boolean;
  /** location allowed for YachtPA at all */
  allowed: boolean;
  /** precise, not approximate */
  precise: boolean;
  /** "Allow all the time" / "Always" */
  always: boolean;
  /** this build can track in the background at all (not Expo Go, not the browser) */
  canAlways: boolean;
};

export async function trackingStatus(): Promise<TrackingStatus> {
  const canAlways = backgroundSupported();
  try {
    const [services, fg] = await Promise.all([Location.hasServicesEnabledAsync(), Location.getForegroundPermissionsAsync()]);
    const allowed = fg.status === 'granted';
    const precise = !allowed ? false : Platform.OS === 'android' ? fg.android?.accuracy !== 'coarse' : Platform.OS === 'ios' ? fg.ios?.accuracy !== 'reduced' : true;
    let always = false;
    if (allowed && canAlways) always = (await Location.getBackgroundPermissionsAsync()).status === 'granted';
    return { services, allowed, precise, always, canAlways };
  } catch {
    return { services: false, allowed: false, precise: false, always: false, canAlways };
  }
}

/** Ready to log with the phone locked or in a pocket. */
export function pocketReady(s: TrackingStatus): boolean {
  return s.services && s.allowed && s.precise && (s.always || !s.canAlways);
}

export async function askAllowed(): Promise<void> {
  const r = await Location.requestForegroundPermissionsAsync().catch(() => null);
  // Refused before: the pop-up will not show again, only Settings can change it.
  if (r && r.status !== 'granted' && !r.canAskAgain) await openAppSettings();
}

export async function askAlways(): Promise<void> {
  const r = await Location.requestBackgroundPermissionsAsync().catch(() => null);
  if (r && r.status !== 'granted' && !r.canAskAgain) await openAppSettings();
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings().catch(() => {});
}

/** The phone's own location switch (Android); app settings elsewhere. */
export function openLocationSwitch(): Promise<void> {
  if (Platform.OS === 'android') return Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(openAppSettings);
  return openAppSettings();
}

/** Android battery saver list, where YachtPA can be set to "Unrestricted" / not optimised. */
export function openBatterySettings(): Promise<void> {
  return Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(openAppSettings);
}
