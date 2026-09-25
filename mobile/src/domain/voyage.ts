/** Everything the summary screen and the experience totals need, from a track. */
import { initialBearingDeg } from './geo';
import { nightMinutes, spansFullNight } from './sun';
import {
  DEFAULT_FILTER,
  DEFAULT_UNDERWAY,
  filterTrack,
  legSpeedsKn,
  trackDistanceNm,
  underwaySegments,
  type FilterConfig,
  type Fix,
  type Segment,
  type UnderwayConfig,
} from './track';

export type PassageKind = 'day' | 'night' | 'overnight';

export type VoyageStats = {
  nm: number;
  durationMin: number;
  underwayMin: number;
  nightMin: number;
  /** Over the underway time when there is any, else over the whole voyage. */
  avgKn: number;
  maxKn: number;
  passage: PassageKind;
  segments: Segment[];
  /** Fixes kept after filtering. */
  fixes: number;
  /** Raw fixes received. */
  rawFixes: number;
  /** Last known heading, degrees true, from the final leg. */
  headingDeg: number | null;
};

export type StatsConfig = {
  filter: FilterConfig;
  underway: UnderwayConfig;
  /** Legs shorter than this are ignored when finding max speed, to damp GPS jitter. */
  maxSpeedMinLegMs: number;
};

export const DEFAULT_STATS: StatsConfig = { filter: DEFAULT_FILTER, underway: DEFAULT_UNDERWAY, maxSpeedMinLegMs: 20_000 };

export function summarize(raw: readonly Fix[], cfg: StatsConfig = DEFAULT_STATS): VoyageStats {
  const fixes = filterTrack(raw, cfg.filter);
  const empty: VoyageStats = {
    nm: 0,
    durationMin: 0,
    underwayMin: 0,
    nightMin: 0,
    avgKn: 0,
    maxKn: 0,
    passage: 'day',
    segments: [],
    fixes: fixes.length,
    rawFixes: raw.length,
    headingDeg: null,
  };
  if (fixes.length < 2) return empty;

  const first = fixes[0];
  const last = fixes[fixes.length - 1];
  const nm = trackDistanceNm(fixes);
  const durationMin = (last.ts - first.ts) / 60_000;
  const segments = underwaySegments(fixes, cfg.underway);
  const underwayMin = segments.reduce((m, s) => m + (s.endTs - s.startTs) / 60_000, 0);
  const nightMin = nightMinutes(fixes);

  const speeds = legSpeedsKn(fixes);
  let maxKn = 0;
  for (let i = 0; i < speeds.length; i++) {
    if (fixes[i + 1].ts - fixes[i].ts >= cfg.maxSpeedMinLegMs) maxKn = Math.max(maxKn, speeds[i]);
  }
  if (maxKn === 0 && speeds.length) maxKn = Math.max(...speeds);

  const hours = (underwayMin > 0 ? underwayMin : durationMin) / 60;
  const avgKn = hours > 0 ? nm / hours : 0;

  let passage: PassageKind = 'day';
  if (nightMin > 0) passage = spansFullNight(first.ts, last.ts, last) ? 'overnight' : 'night';

  const prev = fixes[fixes.length - 2];
  const headingDeg = last.heading ?? (prev ? initialBearingDeg(prev, last) : null);

  return { nm, durationMin, underwayMin, nightMin, avgKn, maxKn, passage, segments, fixes: fixes.length, rawFixes: raw.length, headingDeg };
}
