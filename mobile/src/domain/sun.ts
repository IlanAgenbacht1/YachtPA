/**
 * Sunrise and sunset from the standard sunrise equation (NOAA-style, ±2 min),
 * used to split a track into day and night minutes. Night is between sunset
 * and sunrise at the position of the fix, which is the common denominator of
 * the RYA, MCA and IYT definitions; per-authority variants sit above this.
 */
import type { LatLon } from './geo';

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const MS_PER_DAY = 86_400_000;
/** Standard refraction + solar disc correction for rise/set. */
const ZENITH_OFFSET_DEG = -0.833;

export type SunDay = {
  /** Solar noon, ms since epoch. */
  transit: number;
  /** Null when the sun does not rise (polar night) or set (midnight sun) on this day. */
  sunrise: number | null;
  sunset: number | null;
  /** True when the sun is below the horizon all day. */
  polarNight: boolean;
};

function toJulian(ms: number): number {
  return ms / MS_PER_DAY + 2440587.5;
}

function fromJulian(jd: number): number {
  return (jd - 2440587.5) * MS_PER_DAY;
}

/** The solar day (noon-centred) that contains the instant `ms` at longitude `lon`. */
export function sunDay(ms: number, pos: LatLon): SunDay {
  const n = Math.round(toJulian(ms) - J2000 + 0.0008 - pos.lon / 360);
  const jStar = n - pos.lon / 360;
  const M = ((357.5291 + 0.98560028 * jStar) % 360 + 360) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const λ = ((M + C + 180 + 102.9372) % 360) * RAD;
  const jTransit = J2000 + jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * λ);
  const sinδ = Math.sin(λ) * Math.sin(23.4397 * RAD);
  const cosδ = Math.cos(Math.asin(sinδ));
  const φ = pos.lat * RAD;
  const cosω0 = (Math.sin(ZENITH_OFFSET_DEG * RAD) - Math.sin(φ) * sinδ) / (Math.cos(φ) * cosδ);
  const transit = fromJulian(jTransit);
  if (cosω0 >= 1) return { transit, sunrise: null, sunset: null, polarNight: true };
  if (cosω0 <= -1) return { transit, sunrise: null, sunset: null, polarNight: false };
  const ω0 = Math.acos(cosω0) / RAD;
  return {
    transit,
    sunrise: fromJulian(jTransit - ω0 / 360),
    sunset: fromJulian(jTransit + ω0 / 360),
    polarNight: false,
  };
}

/** Whether the sun is below the horizon at `ms` for a position. */
export function isNight(ms: number, pos: LatLon): boolean {
  const d = sunDay(ms, pos);
  if (d.polarNight) return true;
  if (d.sunrise === null || d.sunset === null) return false;
  return ms < d.sunrise || ms > d.sunset;
}

export type TimedPos = LatLon & { ts: number };

/** Minutes of darkness along a sequence of positions, sampling every `stepMs` inside each gap. */
export function nightMinutes(points: TimedPos[], stepMs = 60_000): number {
  if (points.length < 2) return 0;
  let nightMs = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const span = b.ts - a.ts;
    if (span <= 0) continue;
    const steps = Math.max(1, Math.ceil(span / stepMs));
    const slice = span / steps;
    for (let s = 0; s < steps; s++) {
      const t = a.ts + slice * (s + 0.5);
      const f = (s + 0.5) / steps;
      const pos = { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
      if (isNight(t, pos)) nightMs += slice;
    }
  }
  return nightMs / 60_000;
}

/** True when the interval [startMs, endMs] contains a whole night: a sunset followed by the next sunrise. */
export function spansFullNight(startMs: number, endMs: number, pos: LatLon): boolean {
  // Walk solar day by solar day from the one containing the start; each gives a
  // sunset, and the following day's sunrise closes the night.
  let day = sunDay(startMs, pos);
  for (let guard = 0; guard < 40 && day.transit - MS_PER_DAY <= endMs; guard++) {
    if (day.polarNight) return true;
    const next = sunDay(day.transit + MS_PER_DAY, pos);
    if (day.sunset !== null && day.sunset >= startMs && next.sunrise !== null && next.sunrise <= endMs) return true;
    day = next;
  }
  return false;
}
