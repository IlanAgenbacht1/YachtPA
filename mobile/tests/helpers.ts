import type { Fix, Voyage } from '../src/domain/types';
import { summarizeTrack } from '../src/domain/voyage';

/** Straight run from a to b at `kn`, one fix every `stepS` seconds. */
export function run(a: [number, number], b: [number, number], startTs: number, kn: number, stepS = 30): Fix[] {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  const nm = 2 * R * Math.asin(Math.sqrt(h));
  const durS = (nm / kn) * 3600;
  const n = Math.max(1, Math.round(durS / stepS));
  const out: Fix[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    out.push({ ts: startTs + i * stepS * 1000, lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, accuracy: 8, speed: null });
  }
  return out;
}

/** Sitting still with ±`m` metres of GPS jitter. */
export function jitter(at: [number, number], startTs: number, minutes: number, m = 15, stepS = 30): Fix[] {
  const out: Fix[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let t = 0; t <= minutes * 60; t += stepS) {
    out.push({ ts: startTs + t * 1000, lat: at[0] + (rnd() * m) / 111_320, lon: at[1] + (rnd() * m) / 111_320, accuracy: 10, speed: null });
  }
  return out;
}

let n = 0;
export function voyageFrom(fixes: Fix[], engagementId: string, extra: Partial<Voyage> = {}): Voyage {
  const startedAt = fixes[0].ts;
  const endedAt = fixes[fixes.length - 1].ts;
  const s = summarizeTrack(fixes, startedAt, endedAt);
  return {
    id: `v${++n}`,
    engagementId,
    startedAt,
    endedAt,
    startLat: s.first?.lat ?? null,
    startLon: s.first?.lon ?? null,
    endLat: s.last?.lat ?? null,
    endLon: s.last?.lon ?? null,
    startPlace: '',
    endPlace: '',
    distanceNm: s.distanceNm,
    directNm: s.directNm,
    durationMin: s.durationMin,
    underwayMin: s.underwayMin,
    nightMin: s.nightMin,
    avgKn: s.avgKn,
    maxKn: s.maxKn,
    passageType: s.passageType,
    asSkipper: false,
    source: 'gps',
    status: 'confirmed',
    flags: [],
    segments: s.segments,
    notes: '',
    updatedAt: endedAt,
    ...extra,
  };
}

export const PORT_LOUIS: [number, number] = [-20.16, 57.498];
export const BLACK_RIVER: [number, number] = [-20.36, 57.367];
