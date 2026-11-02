/**
 * Turns raw GPS fixes into voyage numbers (SCOPE §9).
 *
 * - Fixes worse than `maxAccuracyM`, or implying more than `maxJumpKn` from the
 *   last kept fix, are dropped.
 * - Speed at each fix is measured over a window of at least `windowSec`, so
 *   GPS jitter at anchor does not read as movement.
 * - Underway starts when speed stays ≥ `underwayKn` for `startMin`, and ends
 *   after `endMin` below it. Distance, hours underway, night hours and speeds
 *   only count inside underway segments: no phantom miles at anchor.
 *
 * Pure: no React Native imports, so it runs under `node --test`.
 */
import { bearingDeg, distanceNm, type LatLon } from './geo.ts';
import { isNight } from './sun.ts';

export type Fix = LatLon & {
  /** ms since epoch */
  ts: number;
  /** horizontal accuracy in metres, if the device reports it */
  accuracy?: number | null;
};

export type TrackRules = {
  maxAccuracyM: number;
  maxJumpKn: number;
  windowSec: number;
  underwayKn: number;
  startMin: number;
  endMin: number;
};

export const DEFAULT_RULES: TrackRules = {
  maxAccuracyM: 50,
  maxJumpKn: 60,
  windowSec: 60,
  underwayKn: 1,
  startMin: 2,
  endMin: 10,
};

export type Segment = { start: number; end: number; distanceNm: number };

export type TrackSummary = {
  distanceNm: number;
  durationMin: number;
  underwayMin: number;
  nightMin: number;
  avgKn: number;
  maxKn: number;
  /** speed over the last window, for the live screen */
  currentKn: number;
  /** course over ground from the last window, null when stationary */
  headingDeg: number | null;
  segments: Segment[];
  /** underway through a whole night: a segment that starts and ends in daylight with night inside (SCOPE §9) */
  overnight: boolean;
  first: Fix | null;
  last: Fix | null;
  kept: number;
};

const HOUR = 3600000;

export function filterFixes(fixes: Fix[], rules: TrackRules = DEFAULT_RULES): Fix[] {
  const out: Fix[] = [];
  const sorted = [...fixes].sort((a, b) => a.ts - b.ts);
  for (const f of sorted) {
    if (f.accuracy != null && f.accuracy > rules.maxAccuracyM) continue;
    const prev = out[out.length - 1];
    if (prev) {
      const dt = (f.ts - prev.ts) / HOUR;
      if (dt <= 0) continue;
      if (distanceNm(prev, f) / dt > rules.maxJumpKn) continue;
    }
    out.push(f);
  }
  return out;
}

/** Speed in knots at each fix, over the shortest look-back of at least `windowSec`. 0 until the window fills. */
export function windowSpeeds(fixes: Fix[], windowSec: number): number[] {
  const speeds: number[] = [];
  let j = 0;
  for (let i = 0; i < fixes.length; i++) {
    // Advance j to the latest fix that is still at least windowSec before i.
    while (j + 1 < i && fixes[i].ts - fixes[j + 1].ts >= windowSec * 1000) j++;
    const dtMs = fixes[i].ts - fixes[j].ts;
    speeds.push(i > j && dtMs >= windowSec * 1000 ? distanceNm(fixes[j], fixes[i]) / (dtMs / HOUR) : 0);
  }
  return speeds;
}

/** Underway segments as [startIndex, endIndex] pairs into `fixes`. */
function detectSegments(fixes: Fix[], speeds: number[], rules: TrackRules): [number, number][] {
  const out: [number, number][] = [];
  let candidate = -1; // first fix of a run at or above threshold
  let open = -1; // start index of the confirmed segment
  let lastMoving = -1; // last fix at or above threshold in the open segment
  for (let i = 0; i < fixes.length; i++) {
    const moving = speeds[i] >= rules.underwayKn;
    if (open < 0) {
      if (moving) {
        if (candidate < 0) candidate = i;
        if (fixes[i].ts - fixes[candidate].ts >= rules.startMin * 60000) {
          // The window speed at `candidate` already covers the minute before it.
          open = Math.max(0, candidate - 1);
          lastMoving = i;
        }
      } else candidate = -1;
    } else if (moving) {
      lastMoving = i;
    } else if (fixes[i].ts - fixes[lastMoving].ts >= rules.endMin * 60000) {
      out.push([open, lastMoving]);
      open = -1;
      candidate = -1;
    }
  }
  if (open >= 0) out.push([open, lastMoving]);
  return out;
}

export function summarise(
  raw: Fix[],
  opts: { startedAt?: number; endedAt?: number; rules?: TrackRules } = {},
): TrackSummary {
  const rules = opts.rules ?? DEFAULT_RULES;
  const fixes = filterFixes(raw, rules);
  const speeds = windowSpeeds(fixes, rules.windowSec);
  const ranges = detectSegments(fixes, speeds, rules);

  let distance = 0;
  let underwayMs = 0;
  let nightMs = 0;
  let maxKn = 0;
  let overnight = false;
  const segments: Segment[] = [];
  for (const [a, b] of ranges) {
    let segNm = 0;
    let segNight = 0;
    for (let i = a + 1; i <= b; i++) {
      const p = fixes[i - 1];
      const q = fixes[i];
      const dt = q.ts - p.ts;
      segNm += distanceNm(p, q);
      underwayMs += dt;
      const mid = (p.ts + q.ts) / 2;
      if (isNight(mid, (p.lat + q.lat) / 2, (p.lon + q.lon) / 2)) {
        nightMs += dt;
        segNight += dt;
      }
      maxKn = Math.max(maxKn, speeds[i]);
    }
    distance += segNm;
    const fa = fixes[a];
    const fb = fixes[b];
    if (segNight > 0 && !isNight(fa.ts, fa.lat, fa.lon) && !isNight(fb.ts, fb.lat, fb.lon)) overnight = true;
    segments.push({ start: fixes[a].ts, end: fixes[b].ts, distanceNm: segNm });
  }

  const first = fixes[0] ?? null;
  const last = fixes[fixes.length - 1] ?? null;
  const start = opts.startedAt ?? first?.ts ?? 0;
  const end = opts.endedAt ?? last?.ts ?? start;
  const underwayMin = underwayMs / 60000;

  let headingDeg: number | null = null;
  const currentKn = speeds[speeds.length - 1] ?? 0;
  if (fixes.length > 1 && currentKn >= rules.underwayKn) {
    let j = fixes.length - 2;
    while (j > 0 && last!.ts - fixes[j].ts < rules.windowSec * 1000) j--;
    headingDeg = Math.round(bearingDeg(fixes[j], last!));
  }

  return {
    distanceNm: distance,
    durationMin: Math.max(0, (end - start) / 60000),
    underwayMin,
    nightMin: nightMs / 60000,
    avgKn: underwayMin > 0 ? distance / (underwayMin / 60) : 0,
    maxKn,
    currentKn,
    headingDeg,
    segments,
    overnight,
    first,
    last,
    kept: fixes.length,
  };
}

export type SanityFlag = { level: 'ok' | 'warn'; text: string };

/** The checks shown on the voyage summary (SCOPE §9 sanity flags that apply to one voyage). */
export function sanityCheck(s: TrackSummary, prevEnd: LatLon | null): SanityFlag[] {
  const flags: SanityFlag[] = [];
  if (s.durationMin > 24 * 60) flags.push({ level: 'warn', text: 'Longer than 24 hours. Was tracking left on?' });
  if (s.avgKn > 40) flags.push({ level: 'warn', text: 'Average speed over 40 kn. Check the track.' });
  if (s.first && prevEnd && distanceNm(prevEnd, s.first) > 200) {
    flags.push({ level: 'warn', text: 'Starts over 200 NM from where your last voyage ended.' });
  }
  if (s.kept < 2) flags.push({ level: 'warn', text: 'No usable GPS fixes were recorded.' });
  else if (s.distanceNm === 0) flags.push({ level: 'warn', text: 'No movement detected. Stationary the whole time?' });
  if (flags.length === 0) flags.push({ level: 'ok', text: prevEnd ? 'Consistent with your last known position' : 'Track looks consistent' });
  return flags;
}
