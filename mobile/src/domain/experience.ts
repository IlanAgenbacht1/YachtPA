/**
 * Lifetime experience from confirmed records (PRD §5, doc 2 §11–13).
 * Raw facts in, numbers out; authority-specific counting lives in qualifications.ts.
 */
import { addDays, dayKey, daysBetween, eachDay } from './dates';
import type { DayKey, Engagement, LogEntry, PassageType, Propulsion, Vessel, Voyage } from './types';

/** Records that count: confirmed or beyond. Drafts and live voyages do not. */
export function counted<T extends { status: string }>(xs: T[]): T[] {
  return xs.filter((x) => x.status !== 'draft');
}

export function finishedVoyages(voyages: Voyage[]): Voyage[] {
  return counted(voyages).filter((v) => v.endedAt !== null);
}

export type SizeBand = '<24 m' | '24–40 m' | '40–60 m' | '60 m+' | 'Unknown';

export function sizeBand(loaM: number | null): SizeBand {
  if (loaM === null) return 'Unknown';
  if (loaM < 24) return '<24 m';
  if (loaM < 40) return '24–40 m';
  if (loaM < 60) return '40–60 m';
  return '60 m+';
}

export type Ctx = { vessels: Vessel[]; engagements: Engagement[]; voyages: Voyage[]; entries: LogEntry[] };

export function lookup(ctx: Ctx) {
  const eng = new Map(ctx.engagements.map((e) => [e.id, e]));
  const ves = new Map(ctx.vessels.map((v) => [v.id, v]));
  return {
    engagement: (id: string) => eng.get(id),
    vesselOf: (engagementId: string) => {
      const e = eng.get(engagementId);
      return e ? ves.get(e.vesselId) : undefined;
    },
  };
}

/** Underway minutes per local calendar day. */
export function underwayByDay(voyages: Voyage[]): Map<DayKey, number> {
  const out = new Map<DayKey, number>();
  for (const v of voyages) {
    for (const s of v.segments) {
      let t = s.start;
      while (t < s.end) {
        const d = dayKey(t);
        const next = new Date(t);
        next.setHours(24, 0, 0, 0);
        const e = Math.min(s.end, next.getTime());
        out.set(d, (out.get(d) ?? 0) + (e - t) / 60_000);
        t = e;
      }
    }
  }
  return out;
}

export type Breakdown = { label: string; nm: number }[];

export type Experience = {
  nm: number;
  underwayHours: number;
  nightHours: number;
  seaDays: number;
  daysAboard: number;
  nightWatches: number;
  vessels: number;
  flags: number;
  longestPassageNm: number;
  largestVesselM: number | null;
  weekNm: number;
  months: { key: string; nm: number }[];
  since: DayKey | null;
  byPropulsion: Record<Propulsion, number>;
  bySize: Breakdown;
  byPosition: Breakdown;
  byPassage: Record<PassageType, number>;
  commandNm: number;
};

function add(b: Map<string, number>, k: string, n: number) {
  b.set(k, (b.get(k) ?? 0) + n);
}

const toList = (m: Map<string, number>): Breakdown =>
  [...m.entries()].map(([label, nm]) => ({ label, nm })).sort((a, b) => b.nm - a.nm);

export function experience(ctx: Ctx, today: DayKey): Experience {
  const L = lookup(ctx);
  const voyages = finishedVoyages(ctx.voyages);
  const entries = counted(ctx.entries);

  const byProp: Record<Propulsion, number> = { motor: 0, sail: 0 };
  const byPassage: Record<PassageType, number> = { day: 0, night: 0, overnight: 0 };
  const size = new Map<string, number>();
  const pos = new Map<string, number>();
  let nm = 0;
  let underway = 0;
  let night = 0;
  let longest = 0;
  let commandNm = 0;
  let weekNm = 0;
  const weekStart = addDays(today, -6);

  const months: { key: string; nm: number }[] = [];
  const [ty, tm] = today.split('-').map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ty, tm - 1 - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, nm: 0 });
  }

  for (const v of voyages) {
    const ves = L.vesselOf(v.engagementId);
    const eng = L.engagement(v.engagementId);
    nm += v.distanceNm;
    underway += v.underwayMin;
    night += v.nightMin;
    longest = Math.max(longest, v.distanceNm);
    byProp[ves?.propulsion ?? 'motor'] += v.distanceNm;
    byPassage[v.passageType] += v.distanceNm;
    add(size, sizeBand(ves?.loaM ?? null), v.distanceNm);
    add(pos, eng?.position || 'Unknown', v.distanceNm);
    if (v.asSkipper) commandNm += v.distanceNm;
    const day = dayKey(v.startedAt);
    if (daysBetween(weekStart, day) >= 0 && daysBetween(day, today) >= 0) weekNm += v.distanceNm;
    const m = months.find((x) => x.key === day.slice(0, 7));
    if (m) m.nm += v.distanceNm;
  }

  const seaDays = [...underwayByDay(voyages).values()].filter((m) => m > 0).length;

  const aboard = new Set<DayKey>();
  for (const e of ctx.engagements) {
    const end = e.endDate && daysBetween(e.endDate, today) > 0 ? e.endDate : today;
    if (daysBetween(e.startDate, end) < 0) continue;
    for (const d of eachDay(e.startDate, end)) aboard.add(d);
  }

  const used = new Set(ctx.engagements.map((e) => e.vesselId));
  const loas = ctx.vessels.filter((v) => used.has(v.id) && v.loaM !== null).map((v) => v.loaM as number);
  const starts = ctx.engagements.map((e) => e.startDate).sort();

  return {
    nm,
    underwayHours: underway / 60,
    nightHours: night / 60,
    seaDays,
    daysAboard: aboard.size,
    nightWatches: entries.reduce((s, e) => s + e.watches.filter((w) => w.type === 'night').length, 0),
    vessels: used.size,
    flags: voyages.reduce((s, v) => s + v.flags.length, 0),
    longestPassageNm: longest,
    largestVesselM: loas.length ? Math.max(...loas) : null,
    weekNm,
    months,
    since: starts[0] ?? null,
    byPropulsion: byProp,
    bySize: toList(size),
    byPosition: toList(pos),
    byPassage,
    commandNm,
  };
}

export type VesselHistory = {
  engagement: Engagement;
  vessel: Vessel | undefined;
  nm: number;
  seaDays: number;
  voyages: number;
  verified: boolean;
};

/** Career history, newest first (doc 2 §13, PRD §11). */
export function vesselHistory(ctx: Ctx): VesselHistory[] {
  const L = lookup(ctx);
  const voyages = finishedVoyages(ctx.voyages);
  return [...ctx.engagements]
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
    .map((e) => {
      const vs = voyages.filter((v) => v.engagementId === e.id);
      const days = [...underwayByDay(vs).values()].filter((m) => m > 0).length;
      return {
        engagement: e,
        vessel: L.vesselOf(e.id),
        nm: vs.reduce((s, v) => s + v.distanceNm, 0),
        seaDays: days,
        voyages: vs.length,
        verified: vs.length > 0 && vs.every((v) => v.status === 'signed'),
      };
    });
}
