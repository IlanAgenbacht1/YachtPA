import { milestonesReached, type Standing } from '@/domain/milestones';
import { getStanding } from '@/lib/quals';
import { notifyNow } from '@/lib/reminders';
import { track } from '@/telemetry';

/** Where the record stands before a change, to compare after it. Never throws. */
export async function standingBefore(): Promise<Standing | null> {
  return getStanding().catch(() => null);
}

/**
 * After a voyage is added: any milestone reached becomes a notification and the
 * returned message (for the toast); null when nothing was reached.
 */
export async function celebrate(before: Standing | null): Promise<string | null> {
  if (!before) return null;
  try {
    const after = await getStanding();
    const reached = milestonesReached(before, after, after.names);
    if (!reached.length) return null;
    track('milestone', { kinds: reached.map((r) => (r.endsWith('NM logged') ? 'nm' : 'qualification')) });
    await notifyNow('Milestone', reached.join(' · '), reached[0].startsWith('You appear') ? '/experience' : '/');
    return reached[0];
  } catch {
    return null;
  }
}
