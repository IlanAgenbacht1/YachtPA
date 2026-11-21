/**
 * Domain model v0 (docs/SCOPE.md §6). Plain data, no React, no storage:
 * the db layer reads and writes these shapes, the domain functions compute on them.
 *
 * Dates: instants are epoch milliseconds (`number`); calendar days are local
 * "YYYY-MM-DD" strings (`DayKey`).
 */

export type DayKey = string;

/** draft → confirmed → requested → signed. Requested and signed are locked (Phase 2 sign-off). */
export type RecordStatus = 'draft' | 'confirmed' | 'requested' | 'signed';

export const LOCKED_STATUSES: readonly RecordStatus[] = ['requested', 'signed'];

export function isLocked(status: RecordStatus): boolean {
  return LOCKED_STATUSES.includes(status);
}

export type Profile = {
  name: string;
  nationality: string;
  homeCountry: string;
  email: string;
  phone: string;
  /** Set when onboarding is finished. */
  onboardedAt: number | null;
};

export type Propulsion = 'motor' | 'sail';

export type Vessel = {
  id: string;
  name: string;
  /** Free text: "Private", "Charter", "Chase boat". */
  category: string;
  propulsion: Propulsion;
  loaM: number | null;
  gt: number | null;
  flag: string;
  imo: string;
  officialNumber: string;
  homePort: string;
  createdAt: number;
};

export type Engagement = {
  id: string;
  vesselId: string;
  position: string;
  startDate: DayKey;
  /** null while current. */
  endDate: DayKey | null;
  captain: string;
  company: string;
  createdAt: number;
};

export type Fix = {
  ts: number;
  lat: number;
  lon: number;
  /** Horizontal accuracy in metres, when the platform reports it. */
  accuracy: number | null;
  /** Ground speed in m/s, when the platform reports it. */
  speed: number | null;
};

export type PassageType = 'day' | 'night' | 'overnight';

/** One continuous, non-stop stretch underway (RYA's "passage"). */
export type Segment = {
  start: number;
  end: number;
  distanceNm: number;
  /** Straight line from where the segment started to where it ended. */
  directNm: number;
  nightMin: number;
  overnight: boolean;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
};

export type SanityFlag =
  | { kind: 'long'; hours: number }
  | { kind: 'fast'; avgKn: number }
  | { kind: 'jump'; nm: number }
  | { kind: 'no_fixes' };

export type Voyage = {
  id: string;
  engagementId: string;
  startedAt: number;
  /** null while live. */
  endedAt: number | null;
  startLat: number | null;
  startLon: number | null;
  endLat: number | null;
  endLon: number | null;
  startPlace: string;
  endPlace: string;
  distanceNm: number;
  /** Straight-line start → end, the conservative proxy for planned passage length. */
  directNm: number;
  durationMin: number;
  underwayMin: number;
  nightMin: number;
  avgKn: number;
  maxKn: number;
  passageType: PassageType;
  /** Acting as skipper on this passage (counts towards "passages as skipper"). */
  asSkipper: boolean;
  source: 'gps' | 'manual';
  status: RecordStatus;
  flags: SanityFlag[];
  segments: Segment[];
  notes: string;
  updatedAt: number;
};

export type Watch = { start: string; end: string; type: 'night' | 'day' | 'anchor' };

export type Duty = { text: string; /** The words in the transcript this came from, when AI/draft-generated. */ source?: string };

export type LogEntry = {
  id: string;
  engagementId: string;
  date: DayKey;
  location: string;
  activities: string[];
  duties: Duty[];
  watches: Watch[];
  notes: string;
  voiceUri: string | null;
  transcript: string;
  status: RecordStatus;
  updatedAt: number;
};

export type DocType =
  | 'passport'
  | 'visa'
  | 'medical'
  | 'stcw'
  | 'radio'
  | 'first_aid'
  | 'coc'
  | 'course'
  | 'other';

export type Doc = {
  id: string;
  type: DocType;
  name: string;
  issuer: string;
  number: string;
  issueDate: DayKey | null;
  /** null = no expiry. */
  expiryDate: DayKey | null;
  fileUri: string | null;
  fileMime: string | null;
  /** Set when a renewed copy replaces this one; the old one stays as history. */
  supersededBy: string | null;
  createdAt: number;
};

/** Activity tick-list (doc 2 §1). Also the fixed taxonomy the voice draft maps speech onto. */
export const ACTIVITIES = [
  'Line handling',
  'Docking',
  'Anchoring',
  'Tender driving',
  'Navigation',
  'Night watch',
  'Fishing',
  'Maintenance',
  'Washdown',
  'Guest operations',
  'Safety drills',
  'Watersports',
  'Other',
] as const;

export type Activity = (typeof ACTIVITIES)[number];

/** Positions that count days aboard as days in command / as skipper. */
export const SKIPPER_POSITIONS = ['captain', 'skipper', 'master', 'relief captain', 'relief skipper'];

export function isSkipperPosition(position: string): boolean {
  return SKIPPER_POSITIONS.includes(position.trim().toLowerCase());
}
