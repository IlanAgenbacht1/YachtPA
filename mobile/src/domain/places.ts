/**
 * Offline place names for voyage start and end. This is a seed for the
 * Mauritius west coast so the demo passage reads "Port Louis → Black River"
 * without signal; positions are approximate harbour or anchorage centres and
 * should be checked against a chart before the list grows.
 */
import { haversineNm, type LatLon } from './geo';

export type Place = LatLon & { name: string; country: string };

export const PLACES: Place[] = [
  { name: 'Port Louis', country: 'MU', lat: -20.158, lon: 57.498 },
  { name: 'Grand Baie', country: 'MU', lat: -20.012, lon: 57.58 },
  { name: 'Trou aux Biches', country: 'MU', lat: -20.035, lon: 57.545 },
  { name: 'Grand Gaube', country: 'MU', lat: -20.008, lon: 57.66 },
  { name: 'Flic en Flac', country: 'MU', lat: -20.28, lon: 57.36 },
  { name: 'Tamarin', country: 'MU', lat: -20.326, lon: 57.37 },
  { name: 'Black River', country: 'MU', lat: -20.36, lon: 57.36 },
  { name: 'Le Morne', country: 'MU', lat: -20.45, lon: 57.32 },
  { name: 'Blue Bay', country: 'MU', lat: -20.44, lon: 57.71 },
  { name: 'Mahébourg', country: 'MU', lat: -20.41, lon: 57.7 },
  { name: "Trou d'Eau Douce", country: 'MU', lat: -20.24, lon: 57.79 },
];

/** Nearest place within `withinNm`, else null. */
export function nearestPlace(pos: LatLon, withinNm = 3, places: readonly Place[] = PLACES): Place | null {
  let best: Place | null = null;
  let bestNm = withinNm;
  for (const p of places) {
    const d = haversineNm(pos, p);
    if (d <= bestNm) {
      best = p;
      bestNm = d;
    }
  }
  return best;
}

/** "20°09.5′S 057°29.9′E" for when no place is near. */
export function formatPosition(pos: LatLon): string {
  const part = (deg: number, pos: string, neg: string, width: number) => {
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = (abs - d) * 60;
    return `${String(d).padStart(width, '0')}°${m.toFixed(1).padStart(4, '0')}′${deg >= 0 ? pos : neg}`;
  };
  return `${part(pos.lat, 'N', 'S', 2)} ${part(pos.lon, 'E', 'W', 3)}`;
}

/** A place name or a formatted position. */
export function placeLabel(pos: LatLon): string {
  return nearestPlace(pos)?.name ?? formatPosition(pos);
}
