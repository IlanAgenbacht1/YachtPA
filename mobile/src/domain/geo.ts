/** Great-circle and rhumb-line geometry in nautical miles. Pure functions, no platform code. */

export type LatLon = { lat: number; lon: number };

/** Mean Earth radius in nautical miles. */
export const EARTH_RADIUS_NM = 3440.065;

const RAD = Math.PI / 180;

/** Great-circle distance between two positions, in NM. */
export function haversineNm(a: LatLon, b: LatLon): number {
  const φ1 = a.lat * RAD;
  const φ2 = b.lat * RAD;
  const dφ = (b.lat - a.lat) * RAD;
  const dλ = (b.lon - a.lon) * RAD;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, 0..360 degrees true. */
export function initialBearingDeg(a: LatLon, b: LatLon): number {
  const φ1 = a.lat * RAD;
  const φ2 = b.lat * RAD;
  const dλ = (b.lon - a.lon) * RAD;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return ((Math.atan2(y, x) / RAD) + 360) % 360;
}

/** Rhumb-line (constant bearing) distance in NM, for qualification rules that measure passages that way. */
export function rhumbLineNm(a: LatLon, b: LatLon): number {
  const φ1 = a.lat * RAD;
  const φ2 = b.lat * RAD;
  const dφ = φ2 - φ1;
  let dλ = (b.lon - a.lon) * RAD;
  if (Math.abs(dλ) > Math.PI) dλ = dλ > 0 ? dλ - 2 * Math.PI : dλ + 2 * Math.PI;
  const dψ = Math.log(Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2));
  const q = Math.abs(dψ) > 1e-12 ? dφ / dψ : Math.cos(φ1);
  return Math.sqrt(dφ * dφ + q * q * dλ * dλ) * EARTH_RADIUS_NM;
}

/** Speed in knots implied by moving `nm` in `ms` milliseconds. */
export function knots(nm: number, ms: number): number {
  if (ms <= 0) return 0;
  return nm / (ms / 3_600_000);
}
