import type { DayKey } from './types';

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Local calendar day of an instant. */
export function dayKey(ts: number | Date): DayKey {
  const d = typeof ts === 'number' ? new Date(ts) : ts;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight at the start of a day key. */
export function dayStart(key: DayKey): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function addDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/** Every day key from a to b inclusive. */
export function eachDay(a: DayKey, b: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const n = daysBetween(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
}

export function isDayKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
