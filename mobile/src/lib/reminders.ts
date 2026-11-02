/**
 * Local notifications (SCOPE §3.13, §9 sanity flags). No server: everything is
 * scheduled on the phone and rebuilt from the database whenever data changes.
 *
 * - Document expiry: 90, 30 and 7 days before, and on the day, at 09:00.
 * - "Still underway?": 24 h and 48 h after START if the voyage is still live.
 * - Missed days: 18:00 on the third day without a log entry while on a yacht.
 *
 * iOS keeps at most 64 pending notifications per app, so only the soonest 60
 * are scheduled; the rest are picked up on a later rebuild.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getCurrent, getLiveVoyage, listDocs, listLogs } from '@/db/repo';

const MAX_PENDING = 60;
const CHANNEL = 'reminders';
const DOC_LEAD_DAYS = [90, 30, 7, 0];

type Planned = { at: number; title: string; body: string; url: string };

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

/** Asks once, at a moment the user will understand (first voyage or document). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function atLocal(iso: string, hour: number, addDays = 0): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d + addDays, hour, 0, 0).getTime();
}

async function plan(now: number): Promise<Planned[]> {
  const out: Planned[] = [];
  const [docs, current, live, logs] = await Promise.all([listDocs(), getCurrent(), getLiveVoyage(), listLogs(1)]);

  for (const d of docs) {
    if (!d.expires) continue;
    for (const lead of DOC_LEAD_DAYS) {
      const at = atLocal(d.expires, 9, -lead);
      const body = lead === 0 ? `${d.name} expires today.` : `${d.name} expires in ${lead} days.`;
      out.push({ at, title: lead === 0 ? 'Document expires today' : 'Document expiring', body, url: '/documents' });
    }
  }

  if (live) {
    for (const h of [24, 48]) {
      out.push({ at: live.startedAt + h * 3600000, title: 'Still underway?', body: `Your voyage has been tracking for ${h} hours. Stop it if you have arrived.`, url: '/live' });
    }
  }

  if (current) {
    const last = logs[0]?.date ?? current.engagement.startDate;
    let at = atLocal(last, 18, 3);
    if (at <= now) {
      // Already overdue: nudge at 18:00 today, or tomorrow if that has passed.
      const today = new Date(now);
      at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18).getTime();
      if (at <= now) at += 86400000;
    }
    out.push({ at, title: 'Log your days', body: `Nothing logged on ${current.vessel.name} for a few days. Two minutes now saves guessing later.`, url: '/log' });
  }

  return out.filter((p) => p.at > now + 60000).sort((a, b) => a.at - b.at).slice(0, MAX_PENDING);
}

let running: Promise<void> | null = null;
let again = false;

/** Rebuilds every scheduled reminder from the database. Safe to call often; calls are coalesced. */
export function rescheduleReminders(): Promise<void> {
  if (!supported) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        const perm = await Notifications.getPermissionsAsync();
        if (!perm.granted) return;
        const items = await plan(Date.now());
        await Notifications.cancelAllScheduledNotificationsAsync();
        for (const p of items) {
          await Notifications.scheduleNotificationAsync({
            content: { title: p.title, body: p.body, data: { url: p.url } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
          });
        }
      } while (again);
    } catch {
      // Reminders are best-effort; never break the app over them.
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Where a tapped notification should take the user. */
export function urlFromResponse(r: Notifications.NotificationResponse | null | undefined): string | null {
  const url = r?.notification.request.content.data?.url;
  return typeof url === 'string' ? url : null;
}
