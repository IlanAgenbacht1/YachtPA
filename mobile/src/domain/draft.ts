/**
 * Offline log draft from a transcript (SCOPE §4.5–4.6).
 *
 * Works with no signal. It only splits and tidies what was said: every duty
 * keeps the transcript words it came from (`source`), activities come from a
 * fixed taxonomy matched on keywords, and watch times are read from explicit
 * "watch from 9 to 11" phrases. Nothing is added that was not said.
 *
 * When the backend lands, the Claude draft replaces this with polished
 * wording under the same contract (every item maps to a transcript span).
 */
import type { Activity, Duty, Watch } from './types';

export type Draft = {
  duties: Duty[];
  activities: Activity[];
  watches: Watch[];
  passage: { from: string; to: string } | null;
};

const KEYWORDS: [Activity, RegExp][] = [
  ['Washdown', /\b(wash(ed|ing)?( down)?|washdown|chamois(ed)?|rinse[ds]?)\b/i],
  ['Maintenance', /\b(filters?|polish(ed|ing)?|varnish(ed|ing)?|repair(ed|ing)?|servic(e|ed|ing) the|maintenance|replac(ed|ing)|changed|teak|stainless|engine|generator|oil change|paint(ed|ing)?|sanded)\b/i],
  ['Tender driving', /\b(tender|rib|chase boat)\b/i],
  ['Line handling', /\b(lines?|fenders?|mooring|lines? handling)\b/i],
  ['Docking', /\b(dock(ed|ing)?|berth(ed|ing)?|med[- ]moor(ed|ing)?|alongside)\b/i],
  ['Anchoring', /\b(anchor(ed|ing)?)\b/i],
  ['Navigation', /\b(navigat(ed|ion|ing)|passage plan(ning)?|charts?|helm|steer(ed|ing)?|plott(ed|ing))\b/i],
  ['Night watch', /\bnight watch\b/i],
  ['Fishing', /\b(fish(ed|ing)?)\b/i],
  ['Guest operations', /\b(guests?|charter|turndown|service)\b/i],
  ['Safety drills', /\b(safety|drills?|fire|man overboard|mob|abandon ship|life ?jackets?|life ?rafts?)\b/i],
  ['Watersports', /\b(jet ?skis?|seabobs?|paddle ?boards?|wakeboard(ing)?|water ?ski(ing)?|diving|snorkel(l)?ing|toys)\b/i],
];

const FILLER = /^(?:(?:i was|we were|i've|we've|so|ok|okay|um|uh|and|then|also|after that|today|this morning|this afternoon|tonight|was|were|we|i)\b[\s,]*)+/i;

const VERBISH = '(?:\\w+ed|did|made|went|took|ran|drove|set|put|led|got|gave|had|was|were|swept|hung|fed|threw)';

/** "Today we washed down the exterior, polished the stainless and then …" → clauses. */
export function clauses(transcript: string): string[] {
  return transcript
    .replace(/\s+/g, ' ')
    .split(/[.;!?]+|,\s*|\s+and then\s+|\s+then\s+|\s+after that\s+/i)
    .flatMap((c) => c.split(new RegExp(`\\s+and\\s+(?=${VERBISH}\\b)`, 'i')))
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function tidy(clause: string): string {
  const t = clause.replace(FILLER, '').trim();
  if (!t) return '';
  return t[0].toUpperCase() + t.slice(1);
}

function hour(h: number, ampm: string | undefined, night: boolean): number {
  if (ampm?.toLowerCase() === 'pm' && h < 12) return h + 12;
  if (ampm?.toLowerCase() === 'am' && h === 12) return 0;
  if (!ampm && night && h >= 6 && h < 12) return h + 12;
  return h % 24;
}

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function parseTime(raw: string, ampm: string | undefined, night: boolean): string {
  if (/^\d{3,4}$/.test(raw)) {
    const n = raw.padStart(4, '0');
    return hhmm(Number(n.slice(0, 2)) % 24, Number(n.slice(2)) % 60);
  }
  const [h, m] = raw.split(':').map(Number);
  return hhmm(hour(h, ampm, night), m || 0);
}

const WATCH = /\b(night|anchor|day)?\s*watch\w*\s+(?:from\s+)?(\d{1,2}(?::\d{2})?|\d{3,4})\s*(am|pm)?\s*(?:to|until|till|-|–)\s*(\d{1,2}(?::\d{2})?|\d{3,4})\s*(am|pm)?/gi;

export function watches(transcript: string): Watch[] {
  const out: Watch[] = [];
  for (const m of transcript.matchAll(WATCH)) {
    const kind = (m[1]?.toLowerCase() as Watch['type'] | undefined) ?? 'night';
    const night = kind === 'night';
    out.push({ type: kind, start: parseTime(m[2], m[3] ?? m[5], night), end: parseTime(m[4], m[5], night) });
  }
  return out;
}

const PASSAGE = /\bfrom\s+((?:[A-Z][\w'’-]*)(?:\s+(?:[A-Z][\w'’-]*|de|la|le))*)\s+to\s+((?:[A-Z][\w'’-]*)(?:\s+(?:[A-Z][\w'’-]*|de|la|le))*)/;

export function draftFrom(transcript: string): Draft {
  const duties: Duty[] = [];
  const found = new Set<Activity>();
  for (const c of clauses(transcript)) {
    const text = tidy(c);
    if (text.length < 3) continue;
    // Pure passage statements ("I was on Shadow from Port Louis to Black River") are not duties.
    if (/^on\s+\S+.*\bfrom\b.*\bto\b/i.test(text) && !KEYWORDS.some(([, re]) => re.test(text))) continue;
    duties.push({ text, source: c });
    for (const [a, re] of KEYWORDS) if (re.test(c)) found.add(a);
  }
  const p = transcript.match(PASSAGE);
  return {
    duties,
    activities: [...found],
    watches: watches(transcript),
    passage: p ? { from: p[1], to: p[2] } : null,
  };
}
