/**
 * Sun position, accurate to a fraction of a degree, which is minutes at the
 * horizon: plenty for night hours. Night is when the sun's centre is below
 * -0.833° (sunset to sunrise, refraction included). Authority-specific
 * definitions can swap the threshold later (SCOPE §9).
 */

export const SUNSET_ALTITUDE = -0.833;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Sun altitude above the horizon in degrees at `ts` (ms) for a position. */
export function sunAltitude(ts: number, lat: number, lon: number): number {
  const d = ts / 86400000 + 2440587.5 - 2451545.0; // days since J2000
  const g = rad((357.529 + 0.98560028 * d) % 360);
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = rad(q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const e = rad(23.439 - 0.00000036 * d);
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const decl = Math.asin(Math.sin(e) * Math.sin(L));
  const gmstDeg = ((18.697374558 + 24.06570982441908 * d) % 24) * 15;
  const ha = rad(gmstDeg + lon) - ra;
  const la = rad(lat);
  return deg(Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)));
}

export function isNight(ts: number, lat: number, lon: number): boolean {
  return sunAltitude(ts, lat, lon) < SUNSET_ALTITUDE;
}

/**
 * The next time after `ts` the sun crosses the horizon in the given direction,
 * or null within 26 h (polar day or night). Two-minute steps, then bisection.
 */
export function nextCrossing(ts: number, lat: number, lon: number, kind: 'sunset' | 'sunrise'): number | null {
  const STEP = 2 * 60000;
  const wantNight = kind === 'sunset';
  let prev = ts;
  let prevNight = isNight(prev, lat, lon);
  for (let t = ts + STEP; t <= ts + 26 * 3600000; t += STEP) {
    const night = isNight(t, lat, lon);
    if (night !== prevNight && night === wantNight) {
      let lo = prev;
      let hi = t;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        if (isNight(mid, lat, lon) === wantNight) hi = mid;
        else lo = mid;
      }
      return Math.round(hi);
    }
    prev = t;
    prevNight = night;
  }
  return null;
}
