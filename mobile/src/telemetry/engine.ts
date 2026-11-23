/**
 * Anonymous usage and diagnostics: queued on the phone, uploaded in batches
 * when there is signal, deleted once uploaded. Built for weeks offshore: the
 * queue is capped so it can never fill the phone.
 *
 * Pure: the database and the sender are passed in, so tests run it against
 * node:sqlite. `index.ts` wires the real ones.
 */
import type { Db } from '../sync/engine.ts';

export type Item = {
  ts: number;
  kind: 'event' | 'log';
  name: string;
  level?: 'error' | 'warn' | 'info' | null;
  message?: string | null;
  props?: Record<string, unknown>;
};

export type Device = { installId: string; appVersion: string; platform: string; osVersion: string; model: string };

/** One row as the server table takes it. */
export type RemoteRow = {
  install_id: string;
  ts: string;
  kind: string;
  name: string;
  level: string | null;
  message: string | null;
  props: Record<string, unknown>;
  app_version: string;
  platform: string;
  os_version: string;
  model: string;
};

export const QUEUE_CAP = 5000;
const clip = (s: string | null | undefined, n: number) => (s == null ? null : s.length > n ? `${s.slice(0, n - 1)}…` : s);

let inserts = 0;

export async function enqueue(db: Db, item: Item, cap = QUEUE_CAP): Promise<void> {
  await db.runAsync(
    'INSERT INTO telemetry_queue (ts, kind, name, level, message, props) VALUES (?, ?, ?, ?, ?, ?)',
    item.ts,
    item.kind,
    clip(item.name, 64)!,
    item.level ?? null,
    clip(item.message, 2000),
    JSON.stringify(item.props ?? {}),
  );
  // Trim the oldest now and then, so months without signal cannot fill the phone.
  if (++inserts % 50 === 1) {
    await db.runAsync('DELETE FROM telemetry_queue WHERE id <= (SELECT MAX(id) FROM telemetry_queue) - ?', cap);
  }
}

export async function queued(db: Db): Promise<number> {
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM telemetry_queue'))?.n ?? 0;
}

export async function clearQueue(db: Db): Promise<void> {
  await db.execAsync('DELETE FROM telemetry_queue');
}

type QueueRow = { id: number; ts: number; kind: 'event' | 'log'; name: string; level: string | null; message: string | null; props: string };

/**
 * Sends everything queued, oldest first, `batch` rows per request. Rows are
 * deleted only after the server accepted them; on failure the rest stays for
 * next time. Returns how many were sent.
 */
export async function flush(db: Db, send: (rows: RemoteRow[]) => Promise<void>, device: Device, batch = 200): Promise<number> {
  let sent = 0;
  for (;;) {
    const rows = await db.getAllAsync<QueueRow>('SELECT * FROM telemetry_queue ORDER BY id LIMIT ?', batch);
    if (rows.length === 0) break;
    await send(
      rows.map((r) => ({
        install_id: device.installId,
        ts: new Date(r.ts).toISOString(),
        kind: r.kind,
        name: r.name,
        level: r.level,
        message: r.message,
        props: safeParse(r.props),
        app_version: clip(device.appVersion, 32)!,
        platform: device.platform,
        os_version: clip(device.osVersion, 32)!,
        model: clip(device.model, 64)!,
      })),
    );
    await db.runAsync('DELETE FROM telemetry_queue WHERE id <= ?', rows[rows.length - 1].id);
    sent += rows.length;
  }
  return sent;
}

function safeParse(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Battery use per hour of tracking, only when the phone was off the charger at both ends and long enough to mean something. */
export function batteryPerHour(
  start: { level: number; charging: boolean } | null,
  end: { level: number; charging: boolean } | null,
  minutes: number,
): number | null {
  if (!start || !end || start.charging || end.charging || minutes < 30) return null;
  const used = start.level - end.level;
  if (used < 0) return null;
  return Math.round((used / (minutes / 60)) * 100) / 100;
}
