/**
 * From raw GPS fixes to a clean track: accuracy and speed filters, distance,
 * and underway detection. Thresholds are data (docs/SCOPE.md §9) so they can
 * be tuned from the spike without touching the logic.
 */
import { haversineNm, knots, type LatLon } from './geo';

export type Fix = LatLon & {
  /** ms since epoch */
  ts: number;
  /** Horizontal accuracy in metres, null when the platform did not report one. */
  accuracy: number | null;
  /** Reported speed in knots, null when unknown. */
  speedKn: number | null;
  /** Reported heading in degrees true, null when unknown. */
  heading: number | null;
};

export type FilterConfig = {
  /** Drop fixes less accurate than this. */
  maxAccuracyM: number;
  /** Drop fixes implying a jump faster than this since the previous accepted fix. */
  maxSpeedKn: number;
};

export const DEFAULT_FILTER: FilterConfig = { maxAccuracyM: 50, maxSpeedKn: 60 };

export type UnderwayConfig = {
  /** Speed at or above this starts a candidate segment. */
  startKn: number;
  /** ... sustained for at least this long. */
  startMin: number;
  /** Below `startKn` for this long ends the segment. */
  endMin: number;
};

export const DEFAULT_UNDERWAY: UnderwayConfig = { startKn: 1, startMin: 2, endMin: 10 };

/** Whether `next` should be kept, given the last accepted fix. */
export function acceptFix(prev: Fix | null, next: Fix, cfg: FilterConfig = DEFAULT_FILTER): boolean {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return false;
  if (next.accuracy !== null && next.accuracy > cfg.maxAccuracyM) return false;
  if (!prev) return true;
  if (next.ts <= prev.ts) return false;
  const implied = knots(haversineNm(prev, next), next.ts - prev.ts);
  return implied <= cfg.maxSpeedKn;
}

/** Keeps the fixes that pass `acceptFix` against the running last-accepted fix. */
export function filterTrack(fixes: readonly Fix[], cfg: FilterConfig = DEFAULT_FILTER): Fix[] {
  const out: Fix[] = [];
  let prev: Fix | null = null;
  for (const f of fixes) {
    if (acceptFix(prev, f, cfg)) {
      out.push(f);
      prev = f;
    }
  }
  return out;
}

/** Sum of great-circle legs between consecutive fixes, in NM. */
export function trackDistanceNm(fixes: readonly Fix[]): number {
  let nm = 0;
  for (let i = 1; i < fixes.length; i++) nm += haversineNm(fixes[i - 1], fixes[i]);
  return nm;
}

/** Speed over ground between consecutive fixes, derived from position so it works when the platform reports none. */
export function legSpeedsKn(fixes: readonly Fix[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < fixes.length; i++) {
    out.push(knots(haversineNm(fixes[i - 1], fixes[i]), fixes[i].ts - fixes[i - 1].ts));
  }
  return out;
}

export type Segment = { startTs: number; endTs: number; nm: number };

/**
 * Splits a filtered track into underway segments. A segment starts once speed
 * has been at or above `startKn` for `startMin`, and ends once it has been
 * below for `endMin`. Anchored jitter therefore never counts as underway.
 */
export function underwaySegments(fixes: readonly Fix[], cfg: UnderwayConfig = DEFAULT_UNDERWAY): Segment[] {
  const segments: Segment[] = [];
  if (fixes.length < 2) return segments;
  const speeds = legSpeedsKn(fixes);
  const startMs = cfg.startMin * 60_000;
  const endMs = cfg.endMin * 60_000;

  let open: { startIdx: number } | null = null;
  let movingSince: number | null = null; // index of first fast leg in a run
  let slowSince: number | null = null; // index of first slow leg in a run

  for (let i = 0; i < speeds.length; i++) {
    const legEnd = fixes[i + 1];
    const fast = speeds[i] >= cfg.startKn;
    if (!open) {
      if (fast) {
        if (movingSince === null) movingSince = i;
        if (legEnd.ts - fixes[movingSince].ts >= startMs) {
          open = { startIdx: movingSince };
          slowSince = null;
        }
      } else {
        movingSince = null;
      }
    } else {
      if (!fast) {
        if (slowSince === null) slowSince = i;
        if (legEnd.ts - fixes[slowSince].ts >= endMs) {
          segments.push(makeSegment(fixes, open.startIdx, slowSince));
          open = null;
          movingSince = null;
          slowSince = null;
        }
      } else {
        slowSince = null;
      }
    }
  }
  if (open) {
    const endIdx = slowSince ?? fixes.length - 1;
    segments.push(makeSegment(fixes, open.startIdx, endIdx));
  }
  return segments;
}

function makeSegment(fixes: readonly Fix[], startIdx: number, endIdx: number): Segment {
  return {
    startTs: fixes[startIdx].ts,
    endTs: fixes[endIdx].ts,
    nm: trackDistanceNm(fixes.slice(startIdx, endIdx + 1)),
  };
}
