import type { Fix } from './types';

const R_NM = 3440.065; // mean Earth radius in nautical miles
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const MS_TO_KN = 1.943844;

/** Great-circle distance in NM. */
export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function fixDistanceNm(a: Fix, b: Fix): number {
  return distanceNm(a.lat, a.lon, b.lat, b.lon);
}

/** Initial true bearing from a to b, 0–359°. */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export type FilterOptions = { maxAccuracyM: number; maxKn: number };

/** SCOPE §9: accuracy ≤ 50 m, drop fixes implying > 60 kn since the previous kept fix. */
export const DEFAULT_FILTER: FilterOptions = { maxAccuracyM: 50, maxKn: 60 };

/** Sorts by time, drops inaccurate fixes, duplicates and implausible jumps. */
export function filterFixes(fixes: Fix[], opts: FilterOptions = DEFAULT_FILTER): Fix[] {
  const sorted = [...fixes].sort((a, b) => a.ts - b.ts);
  const out: Fix[] = [];
  for (const f of sorted) {
    if (f.accuracy !== null && f.accuracy > opts.maxAccuracyM) continue;
    const prev = out[out.length - 1];
    if (prev) {
      const dtH = (f.ts - prev.ts) / 3_600_000;
      if (dtH <= 0) continue;
      if (fixDistanceNm(prev, f) / dtH > opts.maxKn) continue;
    }
    out.push(f);
  }
  return out;
}

/** "20°09.6′S 57°29.9′E" — used when no named place is near. */
export function fmtLatLon(lat: number, lon: number): string {
  const part = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const deg = Math.floor(a);
    const min = (a - deg) * 60;
    return `${deg}°${min.toFixed(1).padStart(4, '0')}′${v >= 0 ? pos : neg}`;
  };
  return `${part(lat, 'N', 'S')} ${part(lon, 'E', 'W')}`;
}
