/**
 * Qualification rules as data, and the engine that measures a record against
 * them (SCOPE §4.4, §3.9). Pure: no React Native imports, runs under node --test.
 *
 * Seeded from the official RYA exam pages (source URL and the date they were
 * read are on each qualification). Only the standard minimums are encoded;
 * reduced routes (existing certificates, Coastal Skipper course) are noted,
 * not computed.
 *
 * How the RYA terms map onto what the app measures:
 * - Day at sea / day as skipper: RYA = 8 consecutive hours living aboard,
 *   mostly at sea, one per 24 h. App = a local calendar day with at least
 *   4 h underway (the majority of 8 h). Underway is stricter than "at sea",
 *   so this errs on the low side.
 * - Passage over N miles: RYA = non-stop, and both the planned shortest route
 *   and the distance run exceed N. App = one voyage whose track distance and
 *   straight-line start → end distance are both at least N. Straight line is
 *   never longer than the shortest navigable route, so this also errs low.
 * - Tidal waters, certificates held outside the app, age: checklist items.
 */

export type Discipline = 'sail' | 'power';

export type VesselLimit = { maxLoaM?: number; maxGt?: number };

export type Rule =
  | { id: string; kind: 'days'; label: string; min: number; asSkipper?: boolean; vessel?: VesselLimit }
  | { id: string; kind: 'miles'; label: string; min: number; vessel?: VesselLimit }
  | { id: string; kind: 'nightHours'; label: string; min: number }
  | { id: string; kind: 'passages'; label: string; min: number; minNm: number; overnight?: number; asSkipper?: number }
  | { id: string; kind: 'document'; label: string; match: string[] }
  | { id: string; kind: 'check'; label: string };

export type Qualification = {
  id: string;
  authority: string;
  name: string;
  windowYears: number;
  sourceUrl: string;
  verifiedOn: string;
  note: string;
  rules: Rule[];
};

export const QUALIFICATIONS: Qualification[] = [
  {
    id: 'rya-ym-coastal',
    authority: 'RYA',
    name: 'Yachtmaster Coastal',
    windowYears: 10,
    sourceUrl: 'https://www.rya.org.uk/training/certificates-of-competence/yachtmaster-coastal-exam/',
    verifiedOn: '2026-11-02',
    note: 'Standard minimums. Holders of a Coastal Skipper Practical completion certificate may qualify with less sea time and fewer miles; see the RYA page.',
    rules: [
      { id: 'days', kind: 'days', label: 'Days at sea, under 24 m', min: 30, vessel: { maxLoaM: 24 } },
      { id: 'skipper', kind: 'days', label: 'Days as skipper, under 24 m', min: 2, asSkipper: true, vessel: { maxLoaM: 24 } },
      { id: 'miles', kind: 'miles', label: 'Miles', min: 800 },
      { id: 'night', kind: 'nightHours', label: 'Night hours', min: 12 },
      { id: 'radio', kind: 'document', label: 'Radio certificate (SRC or higher)', match: ['src', 'vhf', 'radio', 'gmdss', 'lrc'] },
      { id: 'firstaid', kind: 'document', label: 'First aid certificate', match: ['first aid'] },
      { id: 'tidal', kind: 'check', label: 'At least half of the sea time in tidal waters' },
    ],
  },
  {
    id: 'rya-ym-offshore',
    authority: 'RYA',
    name: 'Yachtmaster Offshore',
    windowYears: 10,
    sourceUrl: 'https://www.rya.org.uk/training/certificates-of-competence/yachtmaster-offshore-exam/',
    verifiedOn: '2026-11-02',
    note: 'Standard minimums. Holders of an Offshore certificate in the other discipline need less; see the RYA page.',
    rules: [
      { id: 'days', kind: 'days', label: 'Days at sea, up to 500 GT', min: 50, vessel: { maxGt: 500 } },
      { id: 'skipper', kind: 'days', label: 'Days as skipper, under 24 m', min: 5, asSkipper: true, vessel: { maxLoaM: 24 } },
      { id: 'miles', kind: 'miles', label: 'Miles, up to 500 GT', min: 2500, vessel: { maxGt: 500 } },
      { id: 'passages', kind: 'passages', label: 'Passages over 60 miles', min: 5, minNm: 60, overnight: 2, asSkipper: 2 },
      { id: 'radio', kind: 'document', label: 'Radio certificate (SRC or higher)', match: ['src', 'vhf', 'radio', 'gmdss', 'lrc'] },
      { id: 'firstaid', kind: 'document', label: 'First aid certificate', match: ['first aid'] },
      { id: 'tidal', kind: 'check', label: 'At least half of the sea time in tidal waters and on vessels under 24 m' },
    ],
  },
];

/** What the engine needs from each confirmed voyage. */
export type QVoyage = {
  startedAt: number;
  distanceNm: number;
  straightNm: number;
  nightMin: number;
  overnight: boolean;
  skipper: boolean;
  underwayByDay: Record<string, number>;
  vessel: { loaM: number | null; gt: number | null; propulsion: 'motor' | 'sail' };
};

export type QDoc = { name: string; expires: string | null };

export type RuleResult = {
  rule: Rule;
  /** numeric rules: progress so far and target; checklist rules: met or not */
  value: number;
  target: number;
  met: boolean;
  /** extra lines, e.g. "2 / 2 overnight" */
  detail?: string;
};

export type QResult = {
  qualification: Qualification;
  discipline: Discipline;
  /** 0–1 across the measurable rules (days, miles, night hours, passages) */
  progress: number;
  /** every measurable sea-time rule is met */
  seaTimeMet: boolean;
  rules: RuleResult[];
  /** vessels whose size is unknown were counted; the user should set it */
  unknownSize: boolean;
};

export const MIN_UNDERWAY_FOR_DAY = 240;

function fits(v: QVoyage['vessel'], limit?: VesselLimit): boolean {
  if (!limit) return true;
  if (limit.maxLoaM != null && v.loaM != null && v.loaM >= limit.maxLoaM) return false;
  if (limit.maxGt != null && v.gt != null && v.gt > limit.maxGt) return false;
  return true;
}

function unknown(v: QVoyage['vessel'], limit?: VesselLimit): boolean {
  if (!limit) return false;
  return (limit.maxLoaM != null && v.loaM == null) || (limit.maxGt != null && v.gt == null);
}

function countDays(voyages: QVoyage[]): number {
  const perDay = new Map<string, number>();
  for (const v of voyages) for (const [d, m] of Object.entries(v.underwayByDay)) perDay.set(d, (perDay.get(d) ?? 0) + m);
  let n = 0;
  for (const m of perDay.values()) if (m >= MIN_UNDERWAY_FOR_DAY) n++;
  return n;
}

function docValid(docs: QDoc[], match: string[], today: string): boolean {
  return docs.some((d) => match.some((m) => d.name.toLowerCase().includes(m)) && (!d.expires || d.expires >= today));
}

export function evaluate(q: Qualification, discipline: Discipline, all: QVoyage[], docs: QDoc[], now: number, checked: Set<string> = new Set()): QResult {
  const since = new Date(now);
  since.setFullYear(since.getFullYear() - q.windowYears);
  const today = new Date(now).toISOString().slice(0, 10);
  const prop = discipline === 'sail' ? 'sail' : 'motor';
  const voyages = all.filter((v) => v.startedAt >= since.getTime() && v.vessel.propulsion === prop);
  let unknownSize = false;

  const rules: RuleResult[] = q.rules.map((rule): RuleResult => {
    switch (rule.kind) {
      case 'days': {
        const vs = voyages.filter((v) => fits(v.vessel, rule.vessel) && (!rule.asSkipper || v.skipper));
        if (vs.some((v) => unknown(v.vessel, rule.vessel))) unknownSize = true;
        const value = countDays(vs);
        return { rule, value, target: rule.min, met: value >= rule.min };
      }
      case 'miles': {
        const vs = voyages.filter((v) => fits(v.vessel, rule.vessel));
        if (vs.some((v) => unknown(v.vessel, rule.vessel))) unknownSize = true;
        const value = vs.reduce((s, v) => s + v.distanceNm, 0);
        return { rule, value, target: rule.min, met: value >= rule.min };
      }
      case 'nightHours': {
        const value = voyages.reduce((s, v) => s + v.nightMin, 0) / 60;
        return { rule, value, target: rule.min, met: value >= rule.min };
      }
      case 'passages': {
        const ps = voyages.filter((v) => v.distanceNm >= rule.minNm && v.straightNm >= rule.minNm);
        const over = ps.filter((v) => v.overnight).length;
        const skip = ps.filter((v) => v.skipper).length;
        const needO = rule.overnight ?? 0;
        const needS = rule.asSkipper ?? 0;
        // Progress counts passages, capped so the sub-requirements must also be met.
        const met = ps.length >= rule.min && over >= needO && skip >= needS;
        const value = met ? rule.min : Math.min(ps.length, rule.min - (over < needO || skip < needS ? 1 : 0));
        const parts = [needO ? `${Math.min(over, needO)} / ${needO} overnight` : '', needS ? `${Math.min(skip, needS)} / ${needS} as skipper` : ''].filter(Boolean);
        return { rule, value: Math.max(0, value), target: rule.min, met, detail: parts.join(' · ') || undefined };
      }
      case 'document': {
        const met = docValid(docs, rule.match, today);
        return { rule, value: met ? 1 : 0, target: 1, met };
      }
      case 'check': {
        const met = checked.has(rule.id);
        return { rule, value: met ? 1 : 0, target: 1, met };
      }
    }
  });

  const measurable = rules.filter((r) => r.rule.kind === 'days' || r.rule.kind === 'miles' || r.rule.kind === 'nightHours' || r.rule.kind === 'passages');
  const progress = measurable.length ? measurable.reduce((s, r) => s + Math.min(1, r.value / r.target), 0) / measurable.length : 0;
  return { qualification: q, discipline, progress, seaTimeMet: measurable.every((r) => r.met), rules, unknownSize };
}
