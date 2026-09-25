/** Plain-language flags for the summary screen (docs/SCOPE.md §9). Empty means nothing looked odd. */
export type SanityInput = {
  durationMin: number;
  avgKn: number;
  maxKn: number;
  nm: number;
  fixes: number;
};

export function sanityFlags(v: SanityInput): string[] {
  const flags: string[] = [];
  if (v.fixes < 2) flags.push('No usable GPS fixes were recorded. Enter this voyage by hand or discard it.');
  if (v.durationMin > 24 * 60) flags.push('Longer than 24 hours. Check that this was one voyage.');
  if (v.avgKn > 40) flags.push('Average speed is unusually high. Check the track before confirming.');
  if (v.fixes >= 2 && v.nm < 0.1) flags.push('Almost no distance covered. Was the boat moving?');
  return flags;
}
