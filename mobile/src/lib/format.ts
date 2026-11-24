/** "1h 04m" from minutes. */
export function fmtDur(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

/** "09:42" from minutes past midnight. */
export function fmtClock(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

/** "2,487" with thin grouping, no locale dependency. */
export function fmtInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Wed 24 Sep" */
export function fmtDateShort(d: Date): string {
  return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** "Wednesday 24 September" */
export function fmtDateLong(d: Date): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * When a voyage ran: "Tue 24 Nov · 13:49 – 14:01", "Tue 24 Nov 22:10 – Wed 25 Nov 06:30" across midnight,
 * and only the date(s) for one typed in by hand (its clock times are not real).
 */
export function fmtSpan(start: Date, end: Date, manual = false): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (manual) return sameDay ? fmtDateShort(start) : `${fmtDateShort(start)} – ${fmtDateShort(end)}`;
  const t = (d: Date) => fmtClock(minutesOfDay(d));
  return sameDay ? `${fmtDateShort(start)} · ${t(start)} – ${t(end)}` : `${fmtDateShort(start)} ${t(start)} – ${fmtDateShort(end)} ${t(end)}`;
}

/** Minutes past midnight for a Date. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "Wed 24 Sep" from "2026-09-24". */
export function fmtIsoShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return fmtDateShort(new Date(y, m - 1, d));
}

/** "24 Sep 2026" from "2026-09-24". */
export function fmtIsoMedium(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "Mar 2025" from "2025-03-14". */
export function fmtIsoMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "42 m" or "—". */
export function fmtLoa(m: number | null): string {
  return m ? `${Number.isInteger(m) ? m : m.toFixed(1)} m` : '—';
}

/** One decimal under 10 so a first short passage does not read as 0; whole numbers above. */
export function fmtNum(n: number): string {
  return n > 0 && n < 10 ? n.toFixed(1) : fmtInt(n);
}
