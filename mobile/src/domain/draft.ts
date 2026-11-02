/**
 * Turns what crew said (keyboard dictation) into a draft log entry: one duty
 * per line, plus activity ticks from the fixed list (SCOPE §2, §3.5).
 *
 * Runs on the phone, offline, free. Rule from the scope: add nothing that
 * was not said. Every duty is a phrase from the text; every tick is triggered
 * by a word in it. The user edits and confirms. An LLM can replace this later
 * behind the same function.
 */

/** Activity → words that mean it. Order matches ACTIVITIES in lib/constants. */
const TAGS: [string, RegExp][] = [
  ['Washdown', /\b(wash(ed|ing)?(\s?down)?|chamois|rins(e|ed|ing)|hosed)\b/i],
  ['Docking', /\b(dock(ed|ing)?|berth(ed|ing)?|moor(ed|ing)|med[- ]moor|came alongside|alongside|lines and fenders|fenders)\b/i],
  ['Anchoring', /\b(anchor(ed|ing|age)?|dropped the hook|weigh(ed)? anchor)\b/i],
  ['Tender', /\b(tender|rib|jet ?skis?|water ?toys|seabobs?)\b/i],
  ['Maintenance', /\b(maint(enance)?|filters?|oil change|servic(ed|ing) the|repair(ed|ing|s)?|fix(ed|ing)|varnish(ed|ing)?|polish(ed|ing)?|sand(ed|ing)|paint(ed|ing)|engine ?room|generators?|impellers?|teak)\b/i],
  ['Watchkeeping', /\b(watch(es|keeping)?|on the helm|helm(ed|ing)?|bridge)\b/i],
  ['Night watch', /\b(night watch(es)?|night shift|graveyard|(watch|helm)\w* (at|through the) night)\b/i],
  ['Navigation', /\b(navigat(e|ed|ing|ion)|passage plan(ning)?|chart(s|ed|work)?|plott?(ed|ing)|route)\b/i],
  ['Guest ops', /\b(guests?|charter(ers)?|owners?|turn ?downs?|beach set ?up|tender runs?)\b/i],
  ['Safety drill', /\b(drills?|muster|fire (drill|exercise)|abandon ship|man overboard|mob|safety (inspection|check|brief(ing)?|walk ?round))\b/i],
  ['Provisioning', /\b(provision(s|ed|ing)?|groceries|stores|shopping|supermarket|deliver(y|ies))\b/i],
  ['Bunkering', /\b(bunker(ed|ing|s)?|refuel(l?ed|l?ing)?|fuel(l?ed|l?ing)( up)?|took on (fuel|diesel)|fuel delivery)\b/i],
];

const LEAD = /^(and then|and also|and|then|also|so|um+|uh+|ok(ay)?|today|this morning|this afternoon|this evening|tonight|after that|afterwards|later|first|finally|we|i)\b[\s,]*/i;

function tidy(phrase: string): string {
  let p = phrase.trim().replace(/\s+/g, ' ');
  for (let i = 0; i < 6; i++) {
    const next = p.replace(LEAD, '');
    if (next === p) break;
    p = next;
  }
  p = p.replace(/[\s.,;:!-]+$/, '');
  return p ? p[0].toUpperCase() + p.slice(1) : '';
}

/** Past-tense verbs that start a new job after a comma: "…, polished the stainless". */
const NEXT_JOB = /,\s*(?=(?:[a-z]+ed|did|made|took|ran|set|put|got|went|gave|swept|hung|brought|built|drove|led|caught|stood|kept|met|ate|threw|wrote|sat|swam|dove|dived|spun|began|stripped)\b)/i;

/** Splits on new lines, full stops, semicolons, "then", ", and", and a comma before a new verb. Keeps "washed and polished" together. */
export function splitDuties(text: string): string[] {
  const parts = text
    .split(/\n|[.;!?](?=\s|$)|,\s*(?:and\s+)?then\b|\s+and\s+then\b|,\s+and\b|,\s+also\b|\s+after that\b|\s+afterwards\b/i)
    .flatMap((p) => p.split(NEXT_JOB))
    .map(tidy)
    .filter((p) => p.length > 2);
  return [...new Set(parts)];
}

export function tagActivities(text: string): string[] {
  const out = TAGS.filter(([, re]) => re.test(text)).map(([tag]) => tag);
  // "night watch" also matches generic watchkeeping; keep only the specific tag when that is all it was.
  if (out.includes('Night watch') && out.includes('Watchkeeping') && !/\b(watch|helm|bridge)\b(?![^.]*night)/i.test(text.replace(/night watch(es)?/gi, ''))) {
    return out.filter((t) => t !== 'Watchkeeping');
  }
  return out;
}

export function draftFromText(text: string): { duties: string[]; activities: string[] } {
  return { duties: splitDuties(text), activities: tagActivities(text) };
}
