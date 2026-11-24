/**
 * Milestones (SCOPE §3.13): crossing a round number of miles, or newly
 * appearing to meet a qualification's sea time. Pure, so it runs under node --test.
 */

export const NM_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

export type Standing = { nm: number; met: string[] };

/** The milestones reached between two snapshots, most important first. */
export function milestonesReached(before: Standing, after: Standing, names: Record<string, string> = {}): string[] {
  const out: string[] = [];
  for (const id of after.met) {
    if (!before.met.includes(id)) out.push(`You appear to meet the sea time for ${names[id] ?? id}`);
  }
  const crossed = NM_MILESTONES.filter((m) => before.nm < m && after.nm >= m);
  if (crossed.length) out.push(`${crossed[crossed.length - 1].toLocaleString('en-GB')} NM logged`);
  return out;
}
