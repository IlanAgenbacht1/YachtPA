/** Loads the record and runs it through the qualification rules. */
import { getCurrent, getSetting, listDocs, listVoyages, setSetting } from '@/db/repo';
import { distanceNm } from '@/domain/geo';
import { evaluate, QUALIFICATIONS, type Discipline, type QResult, type QVoyage } from '@/domain/qualifications';

export async function getDiscipline(): Promise<Discipline> {
  const saved = await getSetting('discipline');
  if (saved === 'sail' || saved === 'power') return saved;
  const c = await getCurrent();
  return c?.vessel.propulsion === 'sail' ? 'sail' : 'power';
}

export const setDiscipline = (d: Discipline) => setSetting('discipline', d);

async function getChecks(): Promise<Record<string, string[]>> {
  try {
    return JSON.parse((await getSetting('qchecks')) ?? '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

export async function toggleCheck(qid: string, ruleId: string): Promise<void> {
  const all = await getChecks();
  const set = new Set(all[qid] ?? []);
  if (set.has(ruleId)) set.delete(ruleId);
  else set.add(ruleId);
  all[qid] = [...set];
  await setSetting('qchecks', JSON.stringify(all));
}

export async function getQualificationResults(): Promise<QResult[]> {
  const [voyages, docs, discipline, checks] = await Promise.all([listVoyages(100000), listDocs(), getDiscipline(), getChecks()]);
  // Simulated voyages are test data and never count.
  const qv: QVoyage[] = voyages
    .filter((v) => v.source !== 'sim')
    .map((v) => ({
      startedAt: v.startedAt,
      distanceNm: v.distanceNm,
      // Typed-in voyages have no positions; the entered miles stand for the planned distance.
      straightNm: v.source === 'manual' ? v.distanceNm : v.start && v.end ? distanceNm(v.start, v.end) : 0,
      nightMin: v.nightMin,
      overnight: v.overnight,
      skipper: v.skipper,
      underwayByDay: v.underwayByDay,
      vessel: v.vessel,
    }));
  const now = Date.now();
  return QUALIFICATIONS.map((q) => evaluate(q, discipline, qv, docs, now, new Set(checks[q.id] ?? [])));
}

/** "Yachtmaster Offshore (Power)" */
export function qualTitle(r: QResult): string {
  return `${r.qualification.name} (${r.discipline === 'sail' ? 'Sail' : 'Power'})`;
}

/** The headline under a qualification: what is left, or that the sea time appears met. */
export function qualHeadline(r: QResult): string {
  if (r.seaTimeMet) return 'Sea time appears to meet the minimums';
  const miles = r.rules.find((x) => x.rule.kind === 'miles' && !x.met);
  if (miles) return `${Math.ceil(miles.target - miles.value).toLocaleString('en-GB')} miles to go`;
  const left = r.rules.find((x) => (x.rule.kind === 'days' || x.rule.kind === 'nightHours' || x.rule.kind === 'passages') && !x.met);
  return left ? `${left.rule.label}: ${Math.floor(left.value)} of ${left.target}` : '';
}
