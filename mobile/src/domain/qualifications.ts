/**
 * Qualification rules engine (SCOPE §4.4). Rules are data (qualData.ts);
 * this file only knows how to measure each rule type against raw records.
 *
 * Counting follows the RYA's definitions:
 * - Day at sea / as skipper: "eight consecutive hours living on board, the
 *   majority of which the vessel should have been at sea". The app cannot see
 *   "living on board", so it counts a local day with ≥ 4 h underway.
 * - Passage: continuously underway, non-stop. "Both the planned distance and
 *   distance run should exceed the required distance." The app uses one
 *   underway segment, with the track distance as distance run and the straight
 *   line start → end as a conservative stand-in for planned distance.
 * - Sea time and passages must be in the exam's discipline (sail or power).
 *
 * The app never says "qualified": only "appears to meet", with the source.
 */
import { dayKey, daysBetween, dayStart } from './dates';
import { docStatus } from './documents';
import { finishedVoyages, lookup, underwayByDay, type Ctx } from './experience';
import type { DayKey, Doc, DocType, Propulsion, Vessel, Voyage } from './types';

export const SEA_DAY_MIN_UNDERWAY = 240;

type VesselLimit = { maxLoaM?: number; maxGt?: number };

export type Rule =
  | ({ id: string; type: 'miles'; min: number; label: string } & VesselLimit)
  | ({ id: string; type: 'days_at_sea'; min: number; label: string } & VesselLimit)
  | ({ id: string; type: 'days_as_skipper'; min: number; label: string } & VesselLimit)
  | { id: string; type: 'night_hours'; min: number; label: string }
  | { id: string; type: 'passages'; count: number; minNm: number; overnight?: boolean; asSkipper?: boolean; label: string }
  | { id: string; type: 'share_small'; share: number; maxLoaM: number; label: string }
  | { id: string; type: 'certificate'; docTypes: DocType[]; label: string }
  | { id: string; type: 'manual'; label: string; note: string };

export type QualDef = {
  id: string;
  authority: string;
  name: string;
  version: number;
  sourceUrl: string;
  extraSources?: string[];
  verifiedOn: DayKey;
  windowYears: number;
  rules: Rule[];
};

export type RuleResult = {
  rule: Rule;
  current: number;
  target: number;
  met: boolean | null; // null = cannot be measured (manual)
  display: string;
  note?: string;
};

export type QualProgress = {
  def: QualDef;
  discipline: Propulsion;
  results: RuleResult[];
  pct: number;
  /** Every measurable sea-time rule met (certificates and manual checks excluded). */
  seaTimeMet: boolean;
  /** Everything measurable met, certificates included. */
  appearsToMeet: boolean;
  headline: RuleResult | undefined;
};

function fits(v: Vessel | undefined, lim: VesselLimit, discipline: Propulsion): boolean {
  if (!v || v.propulsion !== discipline) return false;
  if (lim.maxLoaM !== undefined && (v.loaM === null || v.loaM >= lim.maxLoaM)) return false;
  if (lim.maxGt !== undefined) {
    if (v.gt !== null) return v.gt <= lim.maxGt;
    // Unknown tonnage: a yacht under 24 m is safely under 500 GT; a larger one is not assumed.
    return v.loaM !== null && v.loaM < 24;
  }
  return true;
}

const fmt = (n: number) => Math.floor(n).toLocaleString('en-GB');

export function evaluate(def: QualDef, discipline: Propulsion, ctx: Ctx, docs: Doc[], today: DayKey): QualProgress {
  const L = lookup(ctx);
  const windowStart = new Date(dayStart(today));
  windowStart.setFullYear(windowStart.getFullYear() - def.windowYears);
  const inWindow = finishedVoyages(ctx.voyages).filter((v) => v.startedAt >= windowStart.getTime());
  const vesselOf = (v: Voyage) => L.vesselOf(v.engagementId);
  const pick = (lim: VesselLimit) => inWindow.filter((v) => fits(vesselOf(v), lim, discipline));
  const seaDays = (vs: Voyage[]): DayKey[] =>
    [...underwayByDay(vs).entries()].filter(([, m]) => m >= SEA_DAY_MIN_UNDERWAY).map(([d]) => d);

  const results: RuleResult[] = def.rules.map((rule): RuleResult => {
    switch (rule.type) {
      case 'miles': {
        const cur = pick(rule).reduce((s, v) => s + v.distanceNm, 0);
        return { rule, current: cur, target: rule.min, met: cur >= rule.min, display: `${fmt(cur)} / ${fmt(rule.min)}` };
      }
      case 'days_at_sea': {
        const cur = seaDays(pick(rule)).length;
        return { rule, current: cur, target: rule.min, met: cur >= rule.min, display: `${cur} / ${rule.min}` };
      }
      case 'days_as_skipper': {
        const cur = seaDays(pick(rule).filter((v) => v.asSkipper)).length;
        return { rule, current: cur, target: rule.min, met: cur >= rule.min, display: `${cur} / ${rule.min}` };
      }
      case 'night_hours': {
        const cur = pick({}).reduce((s, v) => s + v.nightMin, 0) / 60;
        return { rule, current: cur, target: rule.min, met: cur >= rule.min, display: `${fmt(cur)} / ${rule.min}` };
      }
      case 'passages': {
        let cur = 0;
        for (const v of pick({})) {
          if (rule.asSkipper && !v.asSkipper) continue;
          cur += v.segments.filter((s) => s.distanceNm > rule.minNm && s.directNm > rule.minNm && (!rule.overnight || s.overnight)).length;
        }
        return { rule, current: cur, target: rule.count, met: cur >= rule.count, display: `${cur} / ${rule.count}` };
      }
      case 'share_small': {
        const all = seaDays(pick({})).length;
        const small = seaDays(pick({ maxLoaM: rule.maxLoaM })).length;
        const share = all ? small / all : 0;
        return {
          rule,
          current: share,
          target: rule.share,
          met: all > 0 && share >= rule.share,
          display: all ? `${Math.round(share * 100)}%` : '–',
        };
      }
      case 'certificate': {
        const held = docs.find((d) => !d.supersededBy && rule.docTypes.includes(d.type) && !(d.expiryDate && daysBetween(today, d.expiryDate) < 0));
        return {
          rule,
          current: held ? 1 : 0,
          target: 1,
          met: !!held,
          display: held ? (docStatus(held, today) === 'ok' ? 'Held' : 'Held · renew soon') : 'Not added',
        };
      }
      case 'manual':
        return { rule, current: 0, target: 1, met: null, display: 'Check', note: rule.note };
    }
  });

  const measurable = results.filter((r) => r.met !== null);
  const pct = measurable.length ? measurable.reduce((s, r) => s + Math.min(1, r.target ? r.current / r.target : 0), 0) / measurable.length : 0;
  const seaRules = measurable.filter((r) => r.rule.type !== 'certificate');

  return {
    def,
    discipline,
    results,
    pct,
    seaTimeMet: seaRules.length > 0 && seaRules.every((r) => r.met),
    appearsToMeet: measurable.length > 0 && measurable.every((r) => r.met),
    headline: results.find((r) => r.rule.type === 'miles'),
  };
}

/** The discipline most of the user's miles are in. */
export function mainDiscipline(ctx: Ctx): Propulsion {
  const L = lookup(ctx);
  let motor = 0;
  let sail = 0;
  for (const v of finishedVoyages(ctx.voyages)) {
    if (L.vesselOf(v.engagementId)?.propulsion === 'sail') sail += v.distanceNm;
    else motor += v.distanceNm;
  }
  if (motor === 0 && sail === 0) return ctx.vessels.some((v) => v.propulsion === 'sail') && !ctx.vessels.some((v) => v.propulsion === 'motor') ? 'sail' : 'motor';
  return sail > motor ? 'sail' : 'motor';
}

/** Wording the app is allowed to use. Never "qualified". */
export function verdict(p: QualProgress): string {
  if (p.appearsToMeet) return 'You appear to meet the logged requirements. Check with the RYA before booking.';
  if (p.seaTimeMet) return 'You appear to meet the sea-time requirements. Certificates still to add.';
  return 'Not there yet.';
}

/** Rule results that tip from unmet to met between two evaluations, for milestone notices. */
export function newlyMet(before: QualProgress, after: QualProgress): RuleResult[] {
  return after.results.filter((r, i) => r.met === true && before.results[i]?.met === false);
}

export const nowDay = () => dayKey(Date.now());
