/**
 * Local notifications: certificate expiry, "still underway?", milestones
 * (SCOPE §3.13). All scheduled on the phone, so they work offshore.
 * Push from a server comes with the backend.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dayStart } from '@/domain/dates';
import { currentDocs, reminderDays, reminderText } from '@/domain/documents';
import { LIMITS } from '@/domain/sanity';
import type { Doc } from '@/domain/types';

const supported = Platform.OS !== 'web';
const REMINDER_HOUR = 9;
/** iOS keeps at most 64 pending; leave room for the underway check. */
const MAX_DOC_REMINDERS = 56;

export function initNotifications() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
}

async function allowed(): Promise<boolean> {
  if (!supported) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function cancelPrefix(prefix: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const at = (ts: number) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date: ts }) as const;

/** Re-plans every expiry reminder from the current documents. Safe to call often. */
export async function scheduleDocReminders(docs: Doc[], today: string) {
  if (!(await allowed())) return;
  try {
    await cancelPrefix('doc-');
    const plan = currentDocs(docs)
      .filter((d) => d.expiryDate)
      .flatMap((d) => reminderDays(d.expiryDate!, today).map((r) => ({ d, ...r })))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .slice(0, MAX_DOC_REMINDERS);
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: `doc-${r.d.id}-${r.day}`,
        content: { title: 'Documents', body: reminderText(r.d.name, r.daysLeft) },
        trigger: at(dayStart(r.day) + REMINDER_HOUR * 3_600_000),
      });
    }
  } catch {
    // Notifications are a convenience; never block the app on them.
  }
}

export async function scheduleStillUnderway(startedAt: number) {
  if (!(await allowed())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'underway',
      content: { title: 'Still underway?', body: `You've been tracking for ${LIMITS.longHours} hours. Open YachtPA to stop the voyage if you've arrived.` },
      trigger: at(startedAt + LIMITS.longHours * 3_600_000),
    });
  } catch {}
}

export async function cancelStillUnderway() {
  if (!supported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('underway');
  } catch {}
}

export async function notifyNow(title: string, body: string) {
  if (!(await allowed())) return;
  try {
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {}
}
