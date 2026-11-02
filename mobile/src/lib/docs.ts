import type { Doc } from '@/db/repo';

export type DocStatus = 'ok' | 'warn' | 'danger';

/** Amber from 90 days out, red once expired. */
export const WARN_DAYS = 90;

export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  const end = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 86400000);
}

export function docStatus(doc: Pick<Doc, 'expires'>, now = new Date()): { status: DocStatus; remaining: string } {
  if (!doc.expires) return { status: 'ok', remaining: 'No expiry' };
  const days = daysUntil(doc.expires, now);
  if (days < 0) return { status: 'danger', remaining: 'Expired' };
  const status: DocStatus = days <= WARN_DAYS ? 'warn' : 'ok';
  if (days === 0) return { status, remaining: 'Today' };
  if (days < 60) return { status, remaining: `${days} day${days === 1 ? '' : 's'}` };
  if (days < 730) return { status, remaining: `${Math.round(days / 30.4)} mo` };
  return { status, remaining: `${Math.floor(days / 365)} yrs` };
}

export function docCounts(docs: Doc[], now = new Date()) {
  let ok = 0;
  let warn = 0;
  let danger = 0;
  for (const d of docs) {
    const s = docStatus(d, now).status;
    if (s === 'ok') ok++;
    else if (s === 'warn') warn++;
    else danger++;
  }
  return { ok, warn, danger };
}
