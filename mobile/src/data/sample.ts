/**
 * The same sample data the prototypes use. Everything on screen today comes
 * from here; the real stores replace this file one entity at a time.
 */

export const vessel = {
  name: 'M/Y Shadow',
  position: 'Deckhand',
  place: 'Port Louis, Mauritius',
  type: 'Motor yacht',
};

export const passage = {
  from: 'Port Louis',
  to: 'Black River',
  startMin: 9 * 60 + 42, // 09:42
  headingDeg: 168,
  aheadNm: 4.1,
  sunset: '18:24',
  gpsAccuracyM: 8,
};

/** Where the simulated voyage starts from, so the demo numbers look lived-in. */
export const simStart = { elapsedMin: 64, nm: 34.2, speed: 9.8, maxSpeed: 11.6 };

export const transcript =
  'Today we washed down the exterior, polished the stainless, checked the tender, changed the fuel filters on the generator and then did a safety inspection before departure.';

export const draftDuties = [
  'Exterior washdown completed',
  'Stainless steel polished',
  'Tender inspected',
  'Generator fuel filters replaced',
  'Pre-departure safety inspection completed',
];

export const activities = ['Washdown', 'Docking', 'Anchoring', 'Tender', 'Maintenance', 'Night watch', 'Guest ops', 'Safety drill'];

export const draftActivities = ['Washdown', 'Tender', 'Maintenance', 'Safety drill'];

export const experience = {
  totalNm: 2487,
  hoursUnderway: 184,
  nightHours: 42,
  weekDelta: '+37 NM this week',
  since: 'Since March 2025 · 5 vessels · 3 flags',
  longestPassage: '380 NM',
  largestVessel: '90 ft',
  /** Twelve months of relative activity for the bar sparkline, last bar is the current month. */
  months: [12, 18, 9, 24, 20, 15, 28, 11, 22, 32, 19, 40],
  monthsFrom: 'Oct 2025',
  monthsTo: 'Sep 2026',
  byType: { motorNm: 2100, sailNm: 387 },
};

export const qualification = {
  name: 'Yachtmaster Offshore',
  pct: 0.51,
  toGo: '1,226 NM to go',
  summary: '1,274 of 2,500 NM · 3 of 5 passages',
  done: 'Sea days and night hours done',
  rows: [
    { label: 'Miles', value: '1,274 / 2,500' },
    { label: 'Passages over 60 NM', value: '3 / 5' },
    { label: 'Days as skipper', value: '2 / 5' },
  ],
};

export type DocStatus = 'ok' | 'warn' | 'danger';

export type Doc = {
  id: string;
  name: string;
  detail: string;
  status: DocStatus;
  remaining: string;
};

export const documents: Doc[] = [
  { id: 'vhf', name: 'VHF SRC', detail: 'RYA · expires 8 Dec 2026', status: 'warn', remaining: '75 days' },
  { id: 'passport', name: 'Passport', detail: 'South Africa · expires 03/2028', status: 'ok', remaining: '2 yrs' },
  { id: 'stcw', name: 'STCW Basic Safety', detail: 'Refresher due 08/2027', status: 'ok', remaining: '11 mo' },
  { id: 'eng1', name: 'ENG1 Medical', detail: 'MCA · expires 05/2027', status: 'ok', remaining: '8 mo' },
  { id: 'pb2', name: 'Powerboat Level 2', detail: 'RYA · no expiry', status: 'ok', remaining: 'Valid' },
  { id: 'padi', name: 'PADI Open Water', detail: 'No expiry', status: 'ok', remaining: 'Valid' },
];

export const docCounts = { valid: 8, expiring: 1 };
