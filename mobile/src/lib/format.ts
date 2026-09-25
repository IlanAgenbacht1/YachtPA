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

/** "09:42" in the device's local time from ms since epoch. */
export function fmtClockMs(ms: number): string {
  const d = new Date(ms);
  return fmtClock(d.getHours() * 60 + d.getMinutes());
}

/** Hours from minutes for totals: one decimal under ten hours, whole hours above. */
export function fmtHours(min: number): string {
  const h = min / 60;
  return h < 10 ? h.toFixed(1) : fmtInt(h);
}
