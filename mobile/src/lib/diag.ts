/**
 * The on-phone diagnostic log behind Profile → Send a problem report.
 *
 * Testers are on boats, often without signal: everything is written to the
 * phone first (SQLite, 14 days kept) and leaves only when the tester shares
 * a report. Logging never throws and never blocks the app.
 */
import Constants from 'expo-constants';
import { Platform, Share } from 'react-native';

import { getDb } from '@/db/db';
import { buildReport, type LogLine } from '@/domain/report';
import { installTag, trackLog } from '@/telemetry';

import { versionInfo } from './updates';

const KEEP_DAYS = 14;
let writes = 0;

export function log(level: LogLine['level'], area: string, message: string, detail?: unknown): void {
  const text = detail == null ? null : detail instanceof Error ? `${detail.message}\n${detail.stack ?? ''}` : typeof detail === 'string' ? detail : safeJson(detail);
  if (__DEV__) console.log(`[${level}] ${area}: ${message}`, text ?? '');
  if (level !== 'info') trackLog(level, area, text ? `${message} | ${text.slice(0, 1500)}` : message);
  (async () => {
    const db = await getDb();
    await db.runAsync('INSERT INTO diag_log (ts, level, area, message, detail) VALUES (?, ?, ?, ?, ?)', Date.now(), level, area, message, text);
    // Prune now and then, not on every write.
    if (++writes % 50 === 1) await db.runAsync('DELETE FROM diag_log WHERE ts < ?', Date.now() - KEEP_DAYS * 86400000);
  })().catch(() => {});
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** "samsung SM-S911B, Android 14" or "iPhone, iOS 18.2". */
export function phoneDescription(): string {
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  if (Platform.OS === 'android') return `${c.Brand ?? ''} ${c.Model ?? ''}, Android ${c.Release ?? Platform.Version}`.trim();
  if (Platform.OS === 'ios') return `${c.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone'}, iOS ${c.osVersion ?? Platform.Version}`;
  return Platform.OS;
}

export function appDescription(): string {
  const v = versionInfo();
  return `${Constants.expoConfig?.version ?? '?'}${__DEV__ ? ' (dev)' : ''} · ${v.label}${v.updateId ? ` (${v.updateId.slice(0, 8)})` : ''}`;
}

/** Catches errors nothing else caught (they would otherwise close the app silently) and writes them down first. */
let installed = false;
export function installErrorLogging(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): (e: Error, fatal?: boolean) => void; setGlobalHandler(h: (e: Error, fatal?: boolean) => void): void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const previous = eu.getGlobalHandler();
  eu.setGlobalHandler((error, fatal) => {
    log('error', fatal ? 'crash' : 'error', error?.message ?? String(error), error);
    previous(error, fatal);
  });
}

async function recentLines(limit = 400): Promise<LogLine[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<LogLine>('SELECT ts, level, area, message, detail FROM diag_log ORDER BY ts DESC LIMIT ?', limit);
  } catch {
    return [];
  }
}

export async function problemReport(settings: Record<string, string | boolean | number | null>, extra?: string): Promise<string> {
  const [lines, install] = await Promise.all([recentLines(), installTag()]);
  const offset = -new Date().getTimezoneOffset() / 60;
  const report = buildReport(
    { app: appDescription(), phone: `${phoneDescription()} · install ${install} · times are phone time (UTC${offset >= 0 ? '+' : ''}${offset})`, settings },
    lines,
  );
  return extra ? `${extra}\n\n${report}` : report;
}

export async function shareProblemReport(settings: Record<string, string | boolean | number | null>, extra?: string): Promise<void> {
  const message = await problemReport(settings, extra);
  await Share.share({ message, title: 'YachtPA problem report' });
}
