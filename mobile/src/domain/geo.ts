/** Geometry on the sphere, in nautical miles. Pure: no React Native imports, so it runs under `node --test`. */

export type LatLon = { lat: number; lon: number };

/** Mean Earth radius in nautical miles. */
const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in NM (haversine). */
export function distanceNm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial true bearing from a to b, 0–359°. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** The point `nm` along `bearing` from `from`. Used by the simulator and tests. */
export function destination(from: LatLon, bearing: number, nm: number): LatLon {
  const d = nm / R_NM;
  const b = rad(bearing);
  const lat1 = rad(from.lat);
  const lon1 = rad(from.lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 };
}

/** "20.16°S 57.50°E" — the fallback place name when there is no reverse geocode (offline). */
export function fmtLatLon(p: LatLon): string {
  const ns = p.lat < 0 ? 'S' : 'N';
  const ew = p.lon < 0 ? 'W' : 'E';
  return `${Math.abs(p.lat).toFixed(2)}°${ns} ${Math.abs(p.lon).toFixed(2)}°${ew}`;
}
