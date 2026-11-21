/**
 * Anti-error checks (PRD §16, SCOPE §9). The app flags, the user decides:
 * nothing here blocks a save.
 */
import { addDays, daysBetween, dayKey } from './dates';
import { distanceNm } from './geo';
import type { DayKey, Engagement, LogEntry, SanityFlag, Voyage } from './types';

export const LIMITS = { longHours: 24, fastKn: 40, jumpNm: 200, missedDays: 3 };

type Pos = { lat: number; lon: number } | null;

export function voyageFlags(input: {
  source: 'gps' | 'manual';
  durationMin: number;
  avgKn: number;
  fixes: number;
  start: Pos;
  /** Where the previous voyage ended. */
  previousEnd: Pos;
}): SanityFlag[] {
  const flags: SanityFlag[] = [];
  if (input.durationMin > LIMITS.longHours * 60) flags.push({ kind: 'long', hours: Math.round(input.durationMin / 60) });
  if (input.avgKn > LIMITS.fastKn) flags.push({ kind: 'fast', avgKn: Math.round(input.avgKn) });
  if (input.source === 'gps' && input.fixes === 0) flags.push({ kind: 'no_fixes' });
  if (input.start && input.previousEnd) {
    const nm = distanceNm(input.previousEnd.lat, input.previousEnd.lon, input.start.lat, input.start.lon);
    if (nm > LIMITS.jumpNm) flags.push({ kind: 'jump', nm: Math.round(nm) });
  }
  return flags;
}

export function flagMessage(f: SanityFlag): string {
  switch (f.kind) {
    case 'long':
      return `Tracked for ${f.hours} hours. Check it was all one voyage.`;
    case 'fast':
      return `Average ${f.avgKn} kn looks unusual. Please check the distance.`;
    case 'jump':
      return `Starts ${f.nm} NM from where your last voyage ended. Please confirm.`;
    case 'no_fixes':
      return 'No GPS positions were recorded. Enter the distance by hand or discard.';
  }
}

/** A live voyage running this long should ask "still underway?". */
export function stillUnderway(startedAt: number, now: number): boolean {
  return now - startedAt > LIMITS.longHours * 3_600_000;
}

/**
 * Days with no log entry and no voyage while engaged, counted back from
 * yesterday. Returns the gap length when it reaches the prompt threshold,
 * otherwise 0.
 */
export function missedDays(engagement: Engagement | null, entries: LogEntry[], voyages: Voyage[], today: DayKey): number {
  if (!engagement) return 0;
  const active = new Set<DayKey>();
  for (const e of entries) if (e.engagementId === engagement.id) active.add(e.date);
  for (const v of voyages) if (v.engagementId === engagement.id) active.add(dayKey(v.startedAt));
  let gap = 0;
  let d = addDays(today, -1);
  while (daysBetween(engagement.startDate, d) >= 0 && !active.has(d)) {
    gap++;
    d = addDays(d, -1);
    if (gap > 365) break;
  }
  return gap >= LIMITS.missedDays ? gap : 0;
}
