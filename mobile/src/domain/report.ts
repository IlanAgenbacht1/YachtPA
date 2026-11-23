/**
 * Problem reports for testers on boats: what happened, on which phone, with
 * which settings, as plain text that pastes into WhatsApp or an email.
 * Pure: no React Native imports, so it is tested under node.
 */
import type { Fix } from './track.ts';

export type LogLine = { ts: number; level: 'error' | 'warn' | 'info'; area: string; message: string; detail: string | null };

export type ReportContext = {
  app: string;
  phone: string;
  settings: Record<string, string | boolean | number | null>;
};

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Newest lines first, trimmed so the whole report stays a size messaging apps accept. */
export function buildReport(ctx: ReportContext, lines: LogLine[], maxChars = 30000): string {
  const head = [
    'YachtPA problem report',
    `App: ${ctx.app}`,
    `Phone: ${ctx.phone}`,
    `Settings: ${Object.entries(ctx.settings)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
    '',
    `Log (newest first, ${lines.length} lines):`,
  ].join('\n');
  const out: string[] = [];
  let size = head.length;
  for (const l of [...lines].sort((a, b) => b.ts - a.ts)) {
    const row = `${stamp(l.ts)} ${l.level.toUpperCase()} [${l.area}] ${l.message}${l.detail ? ` | ${l.detail.replace(/\s+/g, ' ').slice(0, 400)}` : ''}`;
    if (size + row.length + 1 > maxChars) {
      out.push('… older lines left out');
      break;
    }
    out.push(row);
    size += row.length + 1;
  }
  return `${head}\n${out.join('\n')}`;
}

export type Gap = { from: number; to: number; minutes: number };

/** Stretches with no position for at least `minMinutes`: the phone paused the app, or there was no sky view. */
export function trackingGaps(fixes: Fix[], minMinutes = 10): Gap[] {
  const out: Gap[] = [];
  const sorted = [...fixes].sort((a, b) => a.ts - b.ts);
  for (let i = 1; i < sorted.length; i++) {
    const minutes = (sorted[i].ts - sorted[i - 1].ts) / 60000;
    if (minutes >= minMinutes) out.push({ from: sorted[i - 1].ts, to: sorted[i].ts, minutes: Math.round(minutes) });
  }
  return out;
}
