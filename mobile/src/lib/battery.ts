/**
 * Battery level at voyage start and stop, for "% per hour of tracking"
 * (SCOPE §12: under 10% per 12 h). Loaded only when the native module is in
 * the build, so an over-the-air update reaching an older build cannot crash
 * it; then readings are simply null.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type BatteryReading = { level: number; charging: boolean; lowPower: boolean };

type BatteryModule = typeof import('expo-battery');
let mod: BatteryModule | null | undefined;

function load(): BatteryModule | null {
  if (mod !== undefined) return mod;
  mod = null;
  try {
    if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoBattery')) return mod;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-battery') as BatteryModule;
  } catch {
    mod = null;
  }
  return mod;
}

export async function readBattery(): Promise<BatteryReading | null> {
  const m = load();
  if (!m) return null;
  try {
    const s = await m.getPowerStateAsync();
    if (!(s.batteryLevel >= 0)) return null;
    // 2 = charging, 3 = full (on the charger).
    const charging = s.batteryState === 2 || s.batteryState === 3;
    return { level: Math.round(s.batteryLevel * 1000) / 10, charging, lowPower: !!s.lowPowerMode };
  } catch {
    return null;
  }
}
