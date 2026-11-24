/**
 * Turns what crew said into a draft log entry: one duty per line in logbook
 * style, watch times, and activity ticks from the fixed list (SCOPE §2, §3.5).
 *
 * Runs on the phone, offline, free. Rule from the scope: add nothing that
 * was not said. Every duty is a phrase from the text (tidied: past tense,
 * fillers out); every tick is triggered by a word in it. The user edits and
 * confirms.
 *
 * Pipeline: fix common mishearings → pull out watch times → split into jobs
 * (punctuation, connectors, and the start of each new verb) → tidy each job
 * → tick activities. Measured against draft.corpus.test.ts.
 */

// ── Vocabulary ────────────────────────────────────────────────────────────────

/** Verbs crew use about their work, in base form. Forms are derived below. */
const VERBS = `
wash rinse hose scrub squeegee chamois dry wipe mop sweep vacuum hoover dust clean tidy wax buff polish
sand varnish paint prime oil grease lubricate caulk seal fill
check inspect test service replace change fix repair install fit remove refit mount dismantle strip rebuild overhaul
adjust tighten loosen calibrate troubleshoot diagnose upgrade update top
rig derig coil flake stow unload load carry deliver provision shop buy order collect pick drop
drive launch recover tow retrieve deploy
fuel refuel bunker empty pump drain flush charge start stop run monitor log record
plan plot navigate steer helm stand keep
assist help prepare prep set lay serve cook make iron fold launder organise organize sort label count receive greet
brief train practise practice conduct hold attend take give do get go put bring
dock berth moor anchor weigh tie secure untie cast handle lift lower hang raise
cover uncover splice whip seize spend finish begin continue work
`
  .trim()
  .split(/\s+/);

const IRREGULAR: Record<string, string> = {
  do: 'did', make: 'made', take: 'took', run: 'ran', set: 'set', put: 'put', get: 'got', go: 'went', give: 'gave',
  sweep: 'swept', hang: 'hung', bring: 'brought', build: 'built', drive: 'drove', lead: 'led', catch: 'caught',
  stand: 'stood', keep: 'kept', meet: 'met', write: 'wrote', swim: 'swam', begin: 'began', buy: 'bought', lay: 'laid',
  hold: 'held', feed: 'fed', spend: 'spent', cast: 'cast', fit: 'fitted', strip: 'stripped', prep: 'prepped',
  mop: 'mopped', stop: 'stopped', plan: 'planned', plot: 'plotted', top: 'topped', drop: 'dropped', scrub: 'scrubbed',
  rig: 'rigged', derig: 'derigged', ship: 'shipped', trim: 'trimmed', tie: 'tied', untie: 'untied', dry: 'dried',
  empty: 'emptied', tidy: 'tidied', carry: 'carried', ferry: 'ferried', practise: 'practised', chamois: "chamois'd",
};
const DOUBLE = new Set(['strip', 'prep', 'mop', 'stop', 'plan', 'plot', 'top', 'drop', 'scrub', 'rig', 'derig', 'ship', 'trim', 'run', 'get', 'put', 'set', 'swim', 'begin', 'fit', 'shop']);

function pastOf(base: string): string {
  if (IRREGULAR[base]) return IRREGULAR[base];
  if (base.endsWith('e')) return `${base}d`;
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`;
  return `${base}ed`;
}

function ingOf(base: string): string {
  if (base.endsWith('ie')) return `${base.slice(0, -2)}ying`;
  if (base.endsWith('e') && !base.endsWith('ee')) return `${base.slice(0, -1)}ing`;
  if (DOUBLE.has(base)) return `${base}${base.slice(-1)}ing`;
  return `${base}ing`;
}

type Form = 'base' | 'past' | 'ing';
const FORMS = new Map<string, { base: string; form: Form }>();
for (const b of VERBS) {
  FORMS.set(ingOf(b), { base: b, form: 'ing' });
  FORMS.set(pastOf(b), { base: b, form: 'past' });
  FORMS.set(b, { base: b, form: FORMS.get(b)?.form ?? 'base' });
}
// Past forms that look like base forms (set, put, cast) are both; treat as past.
for (const b of ['set', 'put', 'cast']) FORMS.set(b, { base: b, form: 'past' });

/** Irregular past tenses outside the work vocabulary, so "left port" or "came alongside" start a job too. */
const MORE_PAST = `left came saw found felt told said sent lost won ate rode wore tore shook sold paid flew threw grew knew broke
chose froze woke rose fell sat slept heard taught thought fought dug stuck struck sank rang sang drank shut cut hit let read spread bent lent`.split(/\s+/);
const IRREGULAR_PAST = new Set([...Object.values(IRREGULAR), ...MORE_PAST]);

function verbForm(word: string): Form | null {
  // "med-moored" is a verb by its last part.
  const w = word.toLowerCase().split('-').pop() ?? '';
  const known = FORMS.get(w);
  if (known) return known.form;
  if (IRREGULAR_PAST.has(w)) return 'past';
  if (/^[a-z]{3,}ed$/.test(w) && !/^(need|speed|seed|bed|red|shed|feed|hundred|bled)$/.test(w)) return 'past';
  return null;
}

/** Words after which a verb-looking word is describing a thing ("the varnished rail") or part of a phrase. */
const NOT_A_NEW_JOB = /^(the|a|an|my|our|his|her|their|its|this|that|these|those|of|on|in|into|to|with|for|from|at|by|all|some|any|very|had|has|have|was|were|is|are|be|been|got|get|newly|freshly|well|half|fully|being|it)$/i;

// ── Fixes for what recognisers mishear ────────────────────────────────────────

const FIXES: [RegExp, string][] = [
  [/\bshamm?(?:y|ies|ys)\b/gi, 'chamois'],
  [/\bmed(?:iterranean)?[- ](?:more|moor)(ed|ing)?\b/gi, 'med-moor$1'],
  [/\bstern (?:to|too|two)\b/gi, 'stern-to'],
  [/\bsea[- ]?bobs?\b/gi, 'seabob'],
  [/\bturn ?down(s?) (service|services)\b/gi, 'turndown$1 $2'],
  [/\bpassarelle\b/gi, 'passerelle'],
  [/\bwater ?maker\b/gi, 'watermaker'],
  [/\bjet[- ]?skis\b/gi, 'jet skis'],
  [/\bjet[- ]?ski\b/gi, 'jet ski'],
];

/** Yachting ports and places the recogniser returns in lower case. */
const PLACES = [
  'Antibes', 'Cannes', 'Nice', 'Monaco', 'Monte Carlo', 'Menton', 'Saint-Tropez', 'St Tropez', 'Saint Tropez', 'Golfe-Juan', 'Villefranche', 'Beaulieu',
  'Cap Ferrat', 'Cap d\'Antibes', 'La Ciotat', 'Toulon', 'Marseille', 'Porquerolles', 'Calvi', 'Ajaccio', 'Bonifacio', 'Corsica', 'Sardinia',
  'Porto Cervo', 'Olbia', 'Portofino', 'Genoa', 'Sanremo', 'La Spezia', 'Viareggio', 'Elba', 'Capri', 'Naples', 'Amalfi', 'Positano', 'Sicily',
  'Palermo', 'Malta', 'Valletta', 'Mallorca', 'Majorca', 'Palma', 'Ibiza', 'Menorca', 'Formentera', 'Barcelona', 'Gibraltar', 'Croatia', 'Split',
  'Dubrovnik', 'Hvar', 'Montenegro', 'Tivat', 'Greece', 'Athens', 'Mykonos', 'Santorini', 'Corfu', 'Turkey', 'Bodrum', 'Gocek', 'Mediterranean', 'Med',
  'Caribbean', 'St Barths', 'St Maarten', 'Sint Maarten', 'Antigua', 'English Harbour', 'Falmouth', 'BVI', 'Tortola', 'Virgin Gorda', 'Nassau',
  'Bahamas', 'Exumas', 'Fort Lauderdale', 'Miami', 'Palm Beach', 'Newport', 'Southampton', 'Solent', 'Lymington', 'Cowes', 'Dubai', 'Abu Dhabi', 'Maldives', 'Seychelles',
];
const PLACE_RE = new RegExp(String.raw`\b(${PLACES.map((p) => p.replace(/[-\s]/g, '[-\\s]')).join('|')})\b`, 'gi');
const PLACE_CASE = new Map(PLACES.map((p) => [p.toLowerCase().replace(/[-\s]/g, ' '), p]));

function fixMishearings(text: string): string {
  let t = text;
  for (const [re, to] of FIXES) t = t.replace(re, to);
  // "split" and "nice" are ordinary words too: only capitalise them after "in/to/at/from/off".
  return t.replace(PLACE_RE, (m, _p, offset: number) => {
    const key = m.toLowerCase().replace(/[-\s]/g, ' ');
    if (/^(split|nice|med|palma|elba)$/.test(key) && !/\b(?:in|to|at|from|off|for|left|leaving|departed|reached)\s+$/i.test(t.slice(Math.max(0, offset - 12), offset))) return m;
    return PLACE_CASE.get(key) ?? m;
  });
}

// ── Watches ───────────────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  midnight: 0, noon: 12, midday: 12,
};
const TIME = String.raw`(\d{1,2}(?::?\d{2})?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|midnight|noon|midday)(?:\s*(am|pm|a\.m\.|p\.m\.|o'?clock|hundred(?:\s+hours)?))?`;
const WATCH_RE = new RegExp(
  String.raw`(?:\b(?:i|we)\s+)?(?:\b(?:was|were|did|had|stood|kept|took)\s+)?(?:\b(?:an?|the|my|on)\s+)?\b(?:(night|anchor|bridge|nav(?:igation)?|engine|deck|harbou?r|gangway)\s+)?watch(?:es)?\s+(?:from\s+|between\s+)?${TIME}\s*(?:to|till|until|til|-|–|and)\s*${TIME}(?:\s+(in the (?:morning|afternoon|evening)|at night|tonight))?`,
  'gi',
);

/** "did the 8 to 12 watch", "on the 2 to 6 anchor watch". */
const WATCH_RE_2 = new RegExp(
  String.raw`(?:\b(?:i|we)\s+)?(?:\b(?:was|were|did|had|stood|kept|took)\s+)?(?:\b(?:on|the|my)\s+)*\b${TIME}\s*(?:to|till|until|til|-|–)\s*${TIME}\s+(?:(night|anchor|bridge|nav(?:igation)?|engine|deck)\s+)?watch(?:es)?\b`,
  'gi',
);

type Watch = { text: string; night: boolean; anchor: boolean };

function hourOf(raw: string): { h: number; m: number } {
  const w = raw.toLowerCase();
  if (w in NUMBER_WORDS) return { h: NUMBER_WORDS[w], m: 0 };
  const colon = w.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) return { h: +colon[1], m: +colon[2] };
  if (/^\d{3,4}$/.test(w)) return { h: +w.slice(0, -2), m: +w.slice(-2) };
  return { h: +w, m: 0 };
}

function applySuffix(t: { h: number; m: number }, suffix: string | undefined) {
  const s = (suffix ?? '').toLowerCase().replace(/\./g, '');
  if (s === 'pm' && t.h < 12) t.h += 12;
  if (s === 'am' && t.h === 12) t.h = 0;
}

function parseWatch(kind: string | undefined, a: string, aSuf: string | undefined, b: string, bSuf: string | undefined, ctx: string | undefined): Watch {
  const start = hourOf(a);
  const end = hourOf(b);
  applySuffix(start, aSuf);
  applySuffix(end, bSuf);
  const explicit = /[ap]/i.test(`${aSuf ?? ''}${bSuf ?? ''}`) && !/o'?clock|hundred/i.test(`${aSuf ?? ''}${bSuf ?? ''}`);
  const k = (kind ?? '').toLowerCase();
  if (!explicit) {
    if (/afternoon|evening/i.test(ctx ?? '')) {
      if (start.h < 12) start.h += 12;
      if (end.h < 12) end.h += 12;
    } else if (k === 'night' || /night/i.test(ctx ?? '')) {
      // "night watch 10 to 2" means 22:00–02:00.
      if (start.h >= 7 && start.h < 12) start.h += 12;
      if (end.h >= 7 && end.h < 12) end.h += 12;
    }
  }
  if (/pm/i.test(bSuf ?? '') && !aSuf && start.h < 12 && start.h + 12 <= end.h) start.h += 12;
  // No am/pm and the end is earlier than the start: it ran through midnight ("anchor watch 10 to 2").
  if (!explicit && end.h < start.h && start.h < 12 && start.h >= 7) start.h += 12;
  const nightHour = (h: number) => h >= 20 || h < 6;
  const night = k === 'night' || nightHour(start.h) || (end.h > 0 && end.h <= 6) || (end.h === 0 && end.m === 0);
  const fmt = (t: { h: number; m: number }) => `${String(t.h % 24).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
  const label = k ? `${k === 'nav' ? 'Nav' : k[0].toUpperCase() + k.slice(1)} watch` : night ? 'Night watch' : 'Watch';
  return { text: `${label} ${fmt(start)}–${fmt(end)}`, night, anchor: k === 'anchor' };
}

/** Replaces each watch phrase with a placeholder sentence and returns the parsed watches. */
function extractWatches(text: string): { text: string; watches: Watch[] } {
  const watches: Watch[] = [];
  const out = text
    .replace(WATCH_RE, (_m, kind, a, aSuf, b, bSuf, ctx) => {
      watches.push(parseWatch(kind, a, aSuf, b, bSuf, ctx));
      return ` . ⟦${watches.length - 1}⟧ . `;
    })
    .replace(WATCH_RE_2, (_m, a, aSuf, b, bSuf, kind) => {
      watches.push(parseWatch(kind, a, aSuf, b, bSuf, undefined));
      return ` . ⟦${watches.length - 1}⟧ . `;
    });
  return { text: out, watches };
}

// ── Splitting into jobs ───────────────────────────────────────────────────────

const FILLERS = /\b(?:um+|uh+|erm+|er|basically|you know|i mean|sort of|kind of|just|actually|literally|mostly|pretty much)\b/gi;

/** Talk about the day rather than work done: "today was pretty busy", "nothing major". */
const CHATTER = /\b(?:(?:today|it|the day)\s+was\s+(?:a\s+)?(?:pretty\s+|quite\s+|very\s+|really\s+)?(?:busy|quiet|long|good|slow|easy|hard|full|normal)(?:\s+(?:one|day))?|nothing\s+(?:major|much|special)(?:\s+today)?|not\s+much(?:\s+(?:today|on))?|(?:the\s+)?(?:morning|afternoon|evening)\s+was)\b/gi;

/** Connectors between jobs. "also", "plus" and "as well as" only split when a verb follows. */
const PAST_OR_ING = String.raw`(?:[a-z]+ed|[a-z]+ing|did|made|took|ran|set|put|got|went|gave|swept|hung|brought|built|drove|caught|stood|kept|bought|laid|held|spent)\b`;
const CONNECTORS = new RegExp(
  [
    String.raw`\n`,
    String.raw`[.;!?](?=\s|$)`,
    String.raw`,?\s*(?:and\s+)?then\b`,
    String.raw`\s+after that\b`,
    String.raw`\s+afterwards\b`,
    String.raw`,\s+and\b`,
    String.raw`,?\s+(?:also|plus|as well as)\s+(?=(?:we\s+|i\s+)?${PAST_OR_ING})`,
    String.raw`\s+followed by\b`,
    String.raw`,?\s+(?:after|before)\s+(?:lunch|breakfast|dinner)\b`,
    String.raw`,?\s+(?:in the|this)\s+(?:morning|afternoon|evening)\b`,
    String.raw`\s+later on\b`,
    String.raw`\s+so\s+(?=we\b|i\b|mostly\b)`,
  ].join('|'),
  'i',
);

/** How the speaker narrates: "washed…" (past), "washing…" (ing) or "had to wash…" / "wash down…" (base). */
function narrationMode(words: string[]): Form {
  const first = words.find((w) => !/^(and|then|so|we|i|today|this|morning|afternoon|evening|ok|okay|yeah|right)$/i.test(w));
  if (first && verbForm(first) === 'base') return 'base';
  for (let i = 0; i < words.length; i++) {
    if (/^(to)$/i.test(words[i - 1] ?? '') && /^(had|have|got|need|needed)$/i.test(words[i - 2] ?? '') && verbForm(words[i])) return 'base';
    const f = verbForm(words[i]);
    if (f === 'past' || f === 'ing') return f;
  }
  return 'past';
}

/** Splits one stretch of unpunctuated speech before each verb that starts a new job. */
function splitByVerbs(line: string, mode: Form): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  const parts: string[][] = [[]];
  words.forEach((w, i) => {
    const cur = parts[parts.length - 1];
    const prev = words[i - 1] ?? '';
    // Look past a pronoun: "while we bunkered" belongs to the job before it.
    const prevJoin = /^(i|we|they|he|she|you)$/i.test(prev) ? (words[i - 2] ?? '') : '';
    const form = verbForm(w);
    // "-ing" in a past-tense day starts a job only when it reads as a verb after a noun:
    // "tender runs to the beach and back setting up the toys", not "spent the day sanding".
    const ingAsJob = form === 'ing' && AFTER_VERB.test(words[i + 1] ?? '') && !ING_NOT_NEW.test(prev);
    const sameStyle = form === 'past' || (form !== null && form === mode) || ingAsJob;
    // Words that make the job so far, not "we", "and"…: "we sanded and varnished" is one job.
    const content = cur.filter((x) => !/^(and|then|we|i|so|also)$/i.test(x)).length;
    const hasVerb = cur.some((x) => verbForm(x) !== null || /^(had|has|have)$/i.test(x));
    const startsJob = i > 0 && sameStyle && !NOT_A_NEW_JOB.test(prev) && !SUBORDINATE.test(prevJoin || prev) && content >= 2 && (hasVerb || (ingAsJob && content >= 3));
    if (startsJob) {
      while (cur.length && /^(and|then|i|we)$/i.test(cur[cur.length - 1])) cur.pop();
      parts.push([]);
    }
    parts[parts.length - 1].push(w);
  });
  return parts.map((p) => p.join(' '));
}

const SUBORDINATE = /^(while|when|whilst|as|until|till|because|since|whereas|where|if|once)$/i;
const ING_NOT_NEW = /^(and|or|then|day|morning|afternoon|evening|hours?|time|spent|started|finished|kept|went|by|of|for|after|before|while|with|without|from|on|at|in|about|was|were|is|are|been|be|am|i|we)$/i;

/** Past-tense or "-ing" verb after a comma starts a new job: "…, polished the stainless". */
const COMMA_THEN_VERB = new RegExp(String.raw`,\s*(?=${PAST_OR_ING})`, 'i');

// ── Tidying a job ─────────────────────────────────────────────────────────────

const LEAD = /^(?:and|then|also|so|ok(?:ay)?|yeah|right|today|tonight|this morning|this afternoon|this evening|in the morning|in the afternoon|in the evening|first thing|after lunch|after breakfast|later(?: on)?|first|finally|we've|i've|we have|i have|had to|have to|got to|needed to|need to|managed to|went and|we were|i was|we|i)\b[\s,]*/i;

/** Words that follow a verb used as a verb ("washing the decks", "wash down"), not a describing word ("provisioning run"). */
const AFTER_VERB = /^(the|a|an|all|both|some|our|my|his|her|their|its|this|that|these|those|down|up|out|off|over|in|on|around|through|away|back|it|them|everything|every|each|any|two|three|four|several|new|with|for)$/i;

function tidyJob(phrase: string, mode: Form): string {
  let p = phrase.replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 8; i++) {
    const next = p.replace(LEAD, '');
    if (next === p) break;
    p = next;
  }
  p = p.replace(/[\s.,;:!-]+$/, '').replace(/\s+(?:and|then|so)$/i, '');
  if (!p) return '';
  // Logbook style: the leading verb in the past tense ("wash down" / "washing down" -> "Washed down").
  const [first, ...rest] = p.split(' ');
  const known = FORMS.get(first.toLowerCase());
  const next = rest[0] ?? '';
  const usedAsVerb = !next || AFTER_VERB.test(next) || (known?.form === 'base' && mode === 'base');
  const lead = known && known.form !== 'past' && usedAsVerb ? pastOf(known.base) : first;
  const out = [lead, ...rest].join(' ');
  return out[0].toUpperCase() + out.slice(1);
}

/** "Picked up provisions" + "stowed them" reads as one job: rejoin short follow-ons about the same thing. */
function mergeFollowOns(jobs: string[]): string[] {
  const out: string[] = [];
  for (const j of jobs) {
    const words = j.split(' ');
    if (out.length && !j.startsWith('⟦') && !out[out.length - 1].startsWith('⟦') && words.length <= 3 && /\b(it|them|everything|those)\b/i.test(j)) {
      out[out.length - 1] += ` and ${j[0].toLowerCase()}${j.slice(1)}`;
    } else out.push(j);
  }
  return out;
}

export function splitDuties(text: string): string[] {
  return draftFromText(text).duties;
}

// ── Activities ────────────────────────────────────────────────────────────────

/** Activity → words that mean it. Order matches ACTIVITIES in lib/constants. */
const TAGS: [string, RegExp][] = [
  ['Washdown', /\b(wash(ed|ing|es)?(\s?down)?|washdown|chamois|squeegee(d|ing)?|rins(e|ed|ing)|hos(e|ed|ing)( down)?|dried the boat|soap(ed|ing)?)\b/i],
  ['Docking', /\b(left (the )?(port|dock|marina|berth|harbou?r)|dock(ed|ing)?|berth(ed|ing)?|moor(ed|ing)|med-moor(ed|ing)?|stern-to|came alongside|alongside|fenders|passerelle|gangway|cast off|slipped (the )?lines)\b/i],
  ['Anchoring', /\b(anchor(ed|ing|age)?|dropped the hook|the hook|windlass|weigh(ed)? anchor)\b/i],
  ['Tender', /\b(tender|rib|chase boat|jet ?skis?|water ?toys|toys|seabob|paddle ?boards?|wake ?boards?|davit)\b/i],
  ['Maintenance', /\b(maint(enance)?|filters?|oil|impellers?|servic(ed|ing) the|serviced|repair(ed|ing|s)?|fix(ed|ing)|varnish(ed|ing)?|polish(ed|ing)?|sand(ed|ing)|paint(ed|ing)?|engine ?room|engines?|generators?|watermaker|pumps?|bilges?|caulk(ed|ing)?|gel ?coat|teak|wax(ed|ing)?|grease(d)?|touched up|hydraulic|batter(y|ies))\b/i],
  ['Watchkeeping', /\b(watch(es|keeping)?|on the helm|helm(ed|ing)?|bridge|lookout)\b/i],
  ['Night watch', /\b(night watch(es)?|night shift|graveyard|overnight passage|(watch|helm)\w* (at|through the) night)\b/i],
  ['Navigation', /\b(navigat(e|ed|ing|ion)|passage plan(ning)?|chart(s|ed|work)?|plott?(ed|ing)|route|weather|radar)\b/i],
  ['Guest ops', /\b(guests?|charter(ers)?|owners?|turndowns?|beach (club|set ?up)|served (lunch|dinner|breakfast|drinks)|airport runs?)\b/i],
  ['Safety drill', /\b(drills?|muster|fire (drill|exercise)|abandon ship|man overboard|mob|safety (inspection|check|brief(ing)?|walk ?round)|life ?raft|life ?jackets?|extinguishers?|epirb)\b/i],
  ['Provisioning', /\b(provision(s|ed|ing)?|groceries|stores|shopping|supermarket|deliver(y|ies))\b/i],
  ['Bunkering', /\b(bunker(ed|ing|s)?|refuel(l?ed|l?ing)?|fuel(l?ed|l?ing)( up)?|took on (\w+ ){0,4}(fuel|diesel|petrol|gasoil)|fuel delivery|filled (up )?the tanks)\b/i],
];

export function tagActivities(text: string, watches: Watch[] = []): string[] {
  let found = TAGS.filter(([, re]) => re.test(text)).map(([tag]) => tag);
  // Fuel filters are maintenance, not bunkering; plain "fuel" words only count as bunkering with fuelling verbs.
  if (found.includes('Bunkering') && !/\b(bunker|refuel|fuell?ed|fuell?ing|took on|fuel delivery|filled (up )?the tanks)/i.test(text)) {
    found = found.filter((t) => t !== 'Bunkering');
  }
  // "Night watch" also matches generic watchkeeping; keep only the specific tag when that is all it was.
  if (found.includes('Night watch') && found.includes('Watchkeeping') && !/\b(watch|helm|bridge)\b(?![^.]*night)/i.test(text.replace(/night watch(es)?/gi, ''))) {
    found = found.filter((t) => t !== 'Watchkeeping');
  }
  for (const w of watches) {
    found.push(w.night ? 'Night watch' : 'Watchkeeping');
    if (w.anchor) found.push('Anchoring');
  }
  return [...new Set(found)];
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function draftFromText(input: string): { duties: string[]; activities: string[] } {
  const fixed = fixMishearings(input).replace(CHATTER, ' . ');
  const { text, watches } = extractWatches(fixed);
  const mode = narrationMode(text.replace(FILLERS, ' ').split(/\s+/).filter(Boolean));
  const pieces = text
    .split(CONNECTORS)
    .filter((p): p is string => typeof p === 'string')
    .flatMap((p) => p.split(COMMA_THEN_VERB))
    .flatMap((p) => (/,/.test(p) ? [p] : splitByVerbs(p.replace(FILLERS, ' '), mode)));
  const jobs = mergeFollowOns(pieces.map((p) => (/^\s*⟦\d+⟧\s*$/.test(p) ? p.trim() : tidyJob(p, mode))).filter((p) => p.length > 2 || /^⟦\d+⟧$/.test(p)));
  const duties = [...new Set(jobs.map((j) => j.replace(/^⟦(\d+)⟧$/, (_m, i) => watches[+i].text)))];
  // Tick from what was said, with watch phrases counted once through their parsed form.
  const activities = tagActivities(text.replace(/⟦\d+⟧/g, ' '), watches);
  return { duties, activities };
}
