/** "1h 04m" from minutes. */
export function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

/** "09:42" from minutes past midnight. */
export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
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

/** Minutes past midnight for a Date. */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "Wed 24 Sep 2026" from a YYYY-MM-DD day key. */
export function fmtDay(key: string, withYear = true): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${fmtDateShort(dt)}${withYear ? ` ${y}` : ''}`;
}

/** "Mar 2025" from a YYYY-MM-DD day key. */
export function fmtMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** "09:42" from an epoch ms instant. */
export function fmtTime(ts: number): string {
  return fmtClock(minutesOfDay(new Date(ts)));
}

/** "35.2" below 100, "2,487" above. */
export function fmtNm(nm: number): string {
  return nm < 100 ? nm.toFixed(1) : fmtInt(nm);
}
