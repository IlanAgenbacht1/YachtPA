/**
 * Offline place names for voyage start/end (SCOPE §4.7). A starter set of
 * yachting hubs; anything further than MAX_NM from all of them falls back to
 * a lat/lon string, and the user can rename it on the summary.
 * Coordinates are harbour-level (±1 km), which is all nearest-name needs.
 */
import { distanceNm, fmtLatLon } from './geo';

export type Place = { name: string; lat: number; lon: number };

export const MAX_NM = 5;

// prettier-ignore
export const PLACES: Place[] = [
  // Indian Ocean
  { name: 'Port Louis', lat: -20.16, lon: 57.498 }, { name: 'Black River', lat: -20.36, lon: 57.367 },
  { name: 'Grand Baie', lat: -20.012, lon: 57.58 }, { name: 'Mahébourg', lat: -20.408, lon: 57.7 },
  { name: 'Le Port, Réunion', lat: -20.935, lon: 55.29 }, { name: 'Saint-Gilles', lat: -21.054, lon: 55.222 },
  { name: 'Victoria, Seychelles', lat: -4.62, lon: 55.455 }, { name: 'Nosy Be', lat: -13.404, lon: 48.27 },
  { name: 'Malé', lat: 4.175, lon: 73.51 },
  // Gulf
  { name: 'Dubai Marina', lat: 25.08, lon: 55.135 }, { name: 'Port Rashid, Dubai', lat: 25.267, lon: 55.277 },
  { name: 'Abu Dhabi', lat: 24.47, lon: 54.33 }, { name: 'Muscat', lat: 23.627, lon: 58.573 },
  { name: 'Doha', lat: 25.295, lon: 51.54 },
  // Western Med
  { name: 'Antibes', lat: 43.585, lon: 7.128 }, { name: 'Cannes', lat: 43.548, lon: 7.017 },
  { name: 'Nice', lat: 43.695, lon: 7.285 }, { name: 'Monaco', lat: 43.735, lon: 7.425 },
  { name: 'Saint-Tropez', lat: 43.272, lon: 6.64 }, { name: 'Toulon', lat: 43.118, lon: 5.93 },
  { name: 'Marseille', lat: 43.295, lon: 5.365 }, { name: 'Palma', lat: 39.565, lon: 2.635 },
  { name: 'Ibiza', lat: 38.91, lon: 1.44 }, { name: 'Barcelona', lat: 41.375, lon: 2.183 },
  { name: 'Valencia', lat: 39.46, lon: -0.325 }, { name: 'Málaga', lat: 36.715, lon: -4.415 },
  { name: 'Gibraltar', lat: 36.143, lon: -5.355 }, { name: 'Genoa', lat: 44.405, lon: 8.925 },
  { name: 'Portofino', lat: 44.303, lon: 9.21 }, { name: 'La Spezia', lat: 44.1, lon: 9.83 },
  { name: 'Viareggio', lat: 43.865, lon: 10.24 }, { name: 'Porto Cervo', lat: 41.135, lon: 9.537 },
  { name: 'Olbia', lat: 40.92, lon: 9.51 }, { name: 'Bonifacio', lat: 41.388, lon: 9.16 },
  { name: 'Ajaccio', lat: 41.92, lon: 8.74 },
  // Central and Eastern Med
  { name: 'Naples', lat: 40.838, lon: 14.255 }, { name: 'Capri', lat: 40.556, lon: 14.237 },
  { name: 'Amalfi', lat: 40.633, lon: 14.602 }, { name: 'Messina', lat: 38.195, lon: 15.56 },
  { name: 'Valletta', lat: 35.898, lon: 14.513 }, { name: 'Venice', lat: 45.435, lon: 12.34 },
  { name: 'Split', lat: 43.505, lon: 16.435 }, { name: 'Dubrovnik', lat: 42.66, lon: 18.075 },
  { name: 'Tivat', lat: 42.435, lon: 18.693 }, { name: 'Corfu', lat: 39.625, lon: 19.92 },
  { name: 'Piraeus', lat: 37.935, lon: 23.65 }, { name: 'Mykonos', lat: 37.45, lon: 25.325 },
  { name: 'Bodrum', lat: 37.033, lon: 27.43 }, { name: 'Göcek', lat: 36.752, lon: 28.94 },
  // Atlantic
  { name: 'Lisbon', lat: 38.695, lon: -9.17 }, { name: 'Lagos, Portugal', lat: 37.105, lon: -8.67 },
  { name: 'Funchal', lat: 32.645, lon: -16.91 }, { name: 'Las Palmas', lat: 28.13, lon: -15.425 },
  { name: 'Santa Cruz de Tenerife', lat: 28.465, lon: -16.245 }, { name: 'Horta', lat: 38.53, lon: -28.625 },
  { name: 'Falmouth, UK', lat: 50.155, lon: -5.065 }, { name: 'Southampton', lat: 50.895, lon: -1.395 },
  { name: 'Cowes', lat: 50.762, lon: -1.298 },
  // Caribbean
  { name: 'English Harbour, Antigua', lat: 17.005, lon: -61.765 }, { name: 'Simpson Bay, St Maarten', lat: 18.035, lon: -63.1 },
  { name: 'Gustavia', lat: 17.897, lon: -62.851 }, { name: 'Road Town', lat: 18.425, lon: -64.615 },
  { name: 'Charlotte Amalie', lat: 18.335, lon: -64.93 }, { name: 'Nassau', lat: 25.078, lon: -77.335 },
  { name: "St George's, Grenada", lat: 12.045, lon: -61.752 }, { name: 'Rodney Bay', lat: 14.08, lon: -60.95 },
  { name: 'Le Marin', lat: 14.465, lon: -60.87 }, { name: 'Bridgetown', lat: 13.1, lon: -59.625 },
  { name: 'Pointe-à-Pitre', lat: 16.23, lon: -61.53 },
  // Americas
  { name: 'Fort Lauderdale', lat: 26.1, lon: -80.12 }, { name: 'Miami', lat: 25.775, lon: -80.185 },
  { name: 'Palm Beach', lat: 26.715, lon: -80.05 }, { name: 'Key West', lat: 24.56, lon: -81.805 },
  { name: 'Newport, RI', lat: 41.488, lon: -71.32 }, { name: 'Annapolis', lat: 38.975, lon: -76.485 },
  { name: 'Cabo San Lucas', lat: 22.882, lon: -109.91 }, { name: 'Balboa', lat: 8.95, lon: -79.56 },
  // Asia-Pacific and Africa
  { name: 'Phuket', lat: 7.818, lon: 98.355 }, { name: 'Singapore', lat: 1.25, lon: 103.84 },
  { name: 'Hong Kong', lat: 22.285, lon: 114.18 }, { name: 'Auckland', lat: -36.84, lon: 174.755 },
  { name: 'Sydney', lat: -33.855, lon: 151.215 }, { name: 'Papeete', lat: -17.535, lon: -149.57 },
  { name: 'Denarau', lat: -17.77, lon: 177.385 }, { name: 'Cape Town', lat: -33.905, lon: 18.42 },
  { name: 'Durban', lat: -29.865, lon: 31.03 },
];

export function nearestPlace(lat: number, lon: number, maxNm = MAX_NM): Place | null {
  let best: Place | null = null;
  let bestNm = Infinity;
  for (const p of PLACES) {
    const d = distanceNm(lat, lon, p.lat, p.lon);
    if (d < bestNm) {
      best = p;
      bestNm = d;
    }
  }
  return bestNm <= maxNm ? best : null;
}

/** Place name, or a lat/lon string out at sea. */
export function placeName(lat: number, lon: number): string {
  return nearestPlace(lat, lon)?.name ?? fmtLatLon(lat, lon);
}
