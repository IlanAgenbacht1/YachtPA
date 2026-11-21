/**
 * Solar elevation (NOAA general solar position equations). Accurate to well
 * under a minute of sunset time, which is plenty for night-hour logging.
 *
 * Night = sun's upper limb below the horizon, i.e. sunset to sunrise as used
 * for "night hours". Elevation threshold −0.833° accounts for refraction and
 * the solar semi-diameter.
 */

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const SUNSET_ELEVATION = -0.833;

/** Sun elevation above the horizon in degrees at an instant and position. */
export function solarElevation(ts: number, lat: number, lon: number): number {
  const d = new Date(ts);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((ts - start) / 86_400_000) + 1;
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const trueSolarMin = hours * 60 + eqTime + 4 * lon;
  const hourAngle = toRad(trueSolarMin / 4 - 180);
  const latR = toRad(lat);
  const cosZenith = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - toDeg(Math.acos(Math.max(-1, Math.min(1, cosZenith))));
}

export function isNight(ts: number, lat: number, lon: number): boolean {
  return solarElevation(ts, lat, lon) < SUNSET_ELEVATION;
}

/**
 * Next sunset (or sunrise) after `from` within 24 h, found by stepping a minute
 * at a time. Returns null in polar day/night.
 */
export function nextTransition(from: number, lat: number, lon: number, kind: 'sunset' | 'sunrise'): number | null {
  const STEP = 60_000;
  let prevNight = isNight(from, lat, lon);
  for (let t = from + STEP; t <= from + 86_400_000; t += STEP) {
    const night = isNight(t, lat, lon);
    if (kind === 'sunset' && !prevNight && night) return t;
    if (kind === 'sunrise' && prevNight && !night) return t;
    prevNight = night;
  }
  return null;
}
