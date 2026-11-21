/** Certificate wallet: traffic-light status and the reminder schedule (doc 2 §5, §10). */
import { addDays, dayKey, daysBetween } from './dates';
import type { DayKey, Doc, DocType } from './types';

export type DocStatus = 'ok' | 'warn' | 'danger';

export const DOC_TYPES: { type: DocType; label: string }[] = [
  { type: 'passport', label: 'Passport' },
  { type: 'visa', label: 'Visa' },
  { type: 'medical', label: 'Medical (ENG1 etc.)' },
  { type: 'stcw', label: 'STCW' },
  { type: 'radio', label: 'Radio (VHF SRC etc.)' },
  { type: 'first_aid', label: 'First aid' },
  { type: 'coc', label: 'Certificate of competence' },
  { type: 'course', label: 'Course' },
  { type: 'other', label: 'Other' },
];

export function docTypeLabel(t: DocType): string {
  return DOC_TYPES.find((d) => d.type === t)?.label ?? 'Other';
}

/** Amber inside 90 days, red inside 30 days or expired. */
export function docStatus(doc: Pick<Doc, 'expiryDate'>, today: DayKey): DocStatus {
  if (!doc.expiryDate) return 'ok';
  const left = daysBetween(today, doc.expiryDate);
  if (left <= 30) return 'danger';
  if (left <= 90) return 'warn';
  return 'ok';
}

/** "75 days", "11 mo", "2 yrs", "Expired", "Valid". */
export function remainingLabel(doc: Pick<Doc, 'expiryDate'>, today: DayKey): string {
  if (!doc.expiryDate) return 'Valid';
  const left = daysBetween(today, doc.expiryDate);
  if (left < 0) return 'Expired';
  if (left === 0) return 'Today';
  if (left === 1) return '1 day';
  if (left <= 90) return `${left} days`;
  if (left < 730) return `${Math.floor(left / 30.44)} mo`;
  return `${Math.floor(left / 365.25)} yrs`;
}

/** Current documents only: the latest of each renewal chain. */
export function currentDocs(docs: Doc[]): Doc[] {
  return docs.filter((d) => !d.supersededBy);
}

/** Older versions of a document, newest first. */
export function history(doc: Doc, docs: Doc[]): Doc[] {
  const out: Doc[] = [];
  let cur: Doc | undefined = doc;
  for (let i = 0; i < 50 && cur; i++) {
    const prev = docs.find((d) => d.supersededBy === cur!.id);
    if (prev) out.push(prev);
    cur = prev;
  }
  return out;
}

export function counts(docs: Doc[], today: DayKey): { ok: number; warn: number; danger: number } {
  const c = { ok: 0, warn: 0, danger: 0 };
  for (const d of currentDocs(docs)) c[docStatus(d, today)]++;
  return c;
}

/**
 * Reminder days for one document: 90, 60 and 30 days before, then weekly,
 * then daily for the last week and for a week after expiry ("until updated").
 * Only future days are returned. Capped so a phone's notification limit
 * (64 on iOS) is shared fairly across documents.
 */
export function reminderDays(expiry: DayKey, today: DayKey, cap = 12): { day: DayKey; daysLeft: number }[] {
  const offsets = [90, 60, 30, 23, 16, 9, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7];
  const out: { day: DayKey; daysLeft: number }[] = [];
  for (const left of offsets) {
    const day = addDays(expiry, -left);
    if (daysBetween(today, day) > 0) out.push({ day, daysLeft: left });
  }
  return out.slice(0, cap);
}

export function reminderText(name: string, daysLeft: number): string {
  if (daysLeft > 1) return `${name} expires in ${daysLeft} days.`;
  if (daysLeft === 1) return `${name} expires tomorrow.`;
  if (daysLeft === 0) return `${name} expires today.`;
  return `${name} has expired. Add the renewed one when you have it.`;
}

export const todayKey = () => dayKey(Date.now());
