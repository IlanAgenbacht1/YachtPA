/**
 * Turns a raw GPS track into voyage numbers (docs/SCOPE.md §9).
 *
 * - Fixes are filtered first (accuracy, impossible speed).
 * - Underway: ≥ 1 kn sustained ≥ 2 min starts a segment; 10 min below ends it.
 * - Distance, night minutes and max speed only count while underway, so GPS
 *   jitter at anchor or alongside adds no phantom miles.
 * - A segment is one continuous, non-stop passage (RYA's definition of a passage).
 */
import { DEFAULT_FILTER, distanceNm, filterFixes, fixDistanceNm, type FilterOptions } from './geo';
import { isNight, nextTransition } from './sun';
import type { Fix, PassageType, Segment } from './types';

export type { Segment };

export type UnderwayOptions = FilterOptions & {
  minKn: number;
  startAfterMin: number;
  stopAfterMin: number;
};

export const DEFAULT_UNDERWAY: UnderwayOptions = { ...DEFAULT_FILTER, minKn: 1, startAfterMin: 2, stopAfterMin: 10 };

export type TrackSummary = {
  fixes: number;
  first: Fix | null;
  last: Fix | null;
  segments: Segment[];
  distanceNm: number;
  directNm: number;
  durationMin: number;
  underwayMin: number;
  nightMin: number;
  avgKn: number;
  maxKn: number;
  currentKn: number;
  passageType: PassageType;
};

type Interval = { a: Fix; b: Fix; nm: number; kn: number };

const MIN = 60_000;

/**
 * Speed for each interval, measured as displacement over a baseline of at
 * least `baselineMin` (or since the first fix). Fix-to-fix speed is useless at
 * anchor: 15 m of jitter between fixes 30 s apart reads as ~2 kn.
 */
function intervals(fixes: Fix[], baselineMin: number): Interval[] {
  const out: Interval[] = [];
  let j = 0;
  for (let i = 1; i < fixes.length; i++) {
    const a = fixes[i - 1];
    const b = fixes[i];
    while (j + 1 < i && b.ts - fixes[j + 1].ts >= baselineMin * MIN) j++;
    const base = fixes[j];
    const dtH = (b.ts - base.ts) / 3_600_000;
    const kn = dtH > 0 ? fixDistanceNm(base, b) / dtH : 0;
    out.push({ a, b, nm: fixDistanceNm(a, b), kn });
  }
  return out;
}

/** Underway [start, end] windows from the speed state machine. */
function underwayWindows(iv: Interval[], o: UnderwayOptions): [number, number][] {
  const out: [number, number][] = [];
  let underway = false;
  let candidate: number | null = null;
  let slowSince: number | null = null;
  let segStart = 0;
  for (const { a, b, kn } of iv) {
    const fast = kn >= o.minKn;
    if (!underway) {
      if (fast) {
        candidate ??= a.ts;
        if (b.ts - candidate >= o.startAfterMin * MIN) {
          underway = true;
          segStart = candidate;
          slowSince = null;
        }
      } else candidate = null;
    } else if (fast) slowSince = null;
    else {
      slowSince ??= a.ts;
      if (b.ts - slowSince >= o.stopAfterMin * MIN) {
        out.push([segStart, slowSince]);
        underway = false;
        candidate = null;
        slowSince = null;
      }
    }
  }
  if (underway && iv.length) out.push([segStart, slowSince ?? iv[iv.length - 1].b.ts]);
  return out;
}

function lerpFix(a: Fix, b: Fix, ts: number): { lat: number; lon: number } {
  const f = b.ts === a.ts ? 0 : (ts - a.ts) / (b.ts - a.ts);
  return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
}

/** Night minutes in [t0, t1] along a → b, sampled in ≤ 5 min steps. */
function nightMinutes(a: Fix, b: Fix, t0: number, t1: number): number {
  let total = 0;
  const STEP = 5 * MIN;
  for (let s = t0; s < t1; s += STEP) {
    const e = Math.min(t1, s + STEP);
    const p = lerpFix(a, b, (s + e) / 2);
    if (isNight((s + e) / 2, p.lat, p.lon)) total += (e - s) / MIN;
  }
  return total;
}

/** Underway across one full night: from before a sunset to after the following sunrise. */
function spansFullNight(start: number, end: number, lat: number, lon: number): boolean {
  const sunset = nextTransition(start, lat, lon, 'sunset');
  if (sunset === null || sunset >= end) return false;
  const sunrise = nextTransition(sunset, lat, lon, 'sunrise');
  return sunrise !== null && sunrise <= end;
}

/** Position at an instant, interpolated along the track. */
function positionAt(fixes: Fix[], ts: number): { lat: number; lon: number } {
  if (ts <= fixes[0].ts) return fixes[0];
  for (let i = 1; i < fixes.length; i++) {
    if (fixes[i].ts >= ts) return lerpFix(fixes[i - 1], fixes[i], ts);
  }
  return fixes[fixes.length - 1];
}

export function summarizeTrack(raw: Fix[], startedAt: number, endedAt: number, opts: UnderwayOptions = DEFAULT_UNDERWAY): TrackSummary {
  const fixes = filterFixes(raw, opts);
  const iv = intervals(fixes, opts.startAfterMin);
  const windows = underwayWindows(iv, opts);

  const segments: Segment[] = windows.map(([start, end]) => {
    let nm = 0;
    let night = 0;
    for (const x of iv) {
      const s = Math.max(start, x.a.ts);
      const e = Math.min(end, x.b.ts);
      if (e <= s) continue;
      const share = (e - s) / (x.b.ts - x.a.ts);
      nm += x.nm * share;
      night += nightMinutes(x.a, x.b, s, e);
    }
    const p0 = positionAt(fixes, start);
    const p1 = positionAt(fixes, end);
    return {
      start,
      end,
      distanceNm: nm,
      directNm: distanceNm(p0.lat, p0.lon, p1.lat, p1.lon),
      nightMin: night,
      overnight: spansFullNight(start, end, p0.lat, p0.lon),
      startLat: p0.lat,
      startLon: p0.lon,
      endLat: p1.lat,
      endLon: p1.lon,
    };
  });

  let maxKn = 0;
  for (const x of iv) {
    if (!windows.some(([s, e]) => x.a.ts >= s && x.b.ts <= e + MIN)) continue;
    maxKn = Math.max(maxKn, x.kn);
  }

  const distance = segments.reduce((s, g) => s + g.distanceNm, 0);
  const underwayMin = segments.reduce((s, g) => s + (g.end - g.start) / MIN, 0);
  const nightMin = segments.reduce((s, g) => s + g.nightMin, 0);
  const first = fixes[0] ?? null;
  const last = fixes[fixes.length - 1] ?? null;
  const lastIv = iv[iv.length - 1];

  return {
    fixes: fixes.length,
    first,
    last,
    segments,
    distanceNm: distance,
    directNm: first && last ? distanceNm(first.lat, first.lon, last.lat, last.lon) : 0,
    durationMin: Math.max(0, (endedAt - startedAt) / MIN),
    underwayMin,
    nightMin,
    avgKn: underwayMin > 0 ? distance / (underwayMin / 60) : 0,
    maxKn,
    currentKn: lastIv && endedAt - lastIv.b.ts < 5 * MIN ? lastIv.kn : 0,
    passageType: passageTypeOf(segments),
  };
}

export function passageTypeOf(segments: Pick<Segment, 'nightMin' | 'overnight'>[]): PassageType {
  if (segments.some((s) => s.overnight)) return 'overnight';
  if (segments.some((s) => s.nightMin > 0)) return 'night';
  return 'day';
}

/** Segment for a voyage entered by hand: one continuous passage as declared. */
export function manualSegment(start: number, end: number, nm: number, nightMin: number, overnight: boolean): Segment {
  return { start, end, distanceNm: nm, directNm: nm, nightMin, overnight, startLat: NaN, startLon: NaN, endLat: NaN, endLon: NaN };
}
