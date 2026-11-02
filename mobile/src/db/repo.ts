/** Reads and writes for every entity. Screens never write SQL; they call these. */
import type { Fix, TrackSummary } from '@/domain/track';

import { getDb, newId, transaction } from './db';

export type Propulsion = 'motor' | 'sail';
export type RecordStatus = 'draft' | 'confirmed' | 'requested' | 'signed';
export type VoyageStatus = 'live' | RecordStatus;
export type VoyageSource = 'gps' | 'sim' | 'manual';

export type Profile = { name: string; nationality: string | null };
export type Vessel = { id: string; name: string; propulsion: Propulsion; loaM: number | null; gt: number | null; flag: string | null };
export type Engagement = {
  id: string;
  vesselId: string;
  position: string;
  startDate: string;
  endDate: string | null;
  captain: string | null;
  company: string | null;
};
export type Current = { profile: Profile; engagement: Engagement; vessel: Vessel };

export type Voyage = {
  id: string;
  engagementId: string;
  vesselName: string;
  startedAt: number;
  endedAt: number | null;
  fromName: string | null;
  toName: string | null;
  start: { lat: number; lon: number } | null;
  end: { lat: number; lon: number } | null;
  distanceNm: number;
  durationMin: number;
  underwayMin: number;
  nightMin: number;
  avgKn: number;
  maxKn: number;
  overnight: boolean;
  source: VoyageSource;
  status: VoyageStatus;
};

export type LogEntry = {
  id: string;
  engagementId: string;
  date: string;
  activities: string[];
  duties: string[];
  notes: string;
  status: RecordStatus;
  updatedAt: number;
  vesselName?: string;
};

export type Doc = { id: string; name: string; issuer: string | null; number: string | null; expires: string | null };

/** "2026-11-02" in the phone's local time. Log entries and sea days are local calendar days. */
export function localDate(d: Date = new Date()): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

// ── Profile, vessel, engagement ───────────────────────────────────────────────

export async function getCurrent(): Promise<Current | null> {
  const db = await getDb();
  const p = await db.getFirstAsync<{ name: string; nationality: string | null }>('SELECT name, nationality FROM profile WHERE id = 1');
  if (!p) return null;
  const row = await db.getFirstAsync<EngagementRow & VesselRow>(
    `SELECT e.*, v.id AS v_id, v.name AS v_name, v.propulsion, v.loa_m, v.gt, v.flag
       FROM engagements e JOIN vessels v ON v.id = e.vessel_id
      WHERE e.end_date IS NULL ORDER BY e.start_date DESC LIMIT 1`,
  );
  if (!row) return null;
  return { profile: p, engagement: toEngagement(row), vessel: toVessel(row) };
}

export async function onboard(input: {
  name: string;
  position: string;
  vesselName: string;
  propulsion: Propulsion;
  loaM: number | null;
  startDate: string;
}): Promise<void> {
  const now = Date.now();
  const vesselId = newId();
  await transaction(async (txn) => {
    await txn.runAsync('INSERT OR REPLACE INTO profile (id, name, created_at) VALUES (1, ?, ?)', input.name, now);
    await txn.runAsync('INSERT INTO vessels (id, name, propulsion, loa_m, created_at) VALUES (?, ?, ?, ?, ?)', vesselId, input.vesselName, input.propulsion, input.loaM, now);
    await txn.runAsync(
      'INSERT INTO engagements (id, vessel_id, position, start_date, created_at) VALUES (?, ?, ?, ?, ?)',
      newId(),
      vesselId,
      input.position,
      input.startDate,
      now,
    );
  });
}

export async function updateCurrent(c: Current): Promise<void> {
  await transaction(async (txn) => {
    await txn.runAsync('UPDATE profile SET name = ?, nationality = ? WHERE id = 1', c.profile.name, c.profile.nationality);
    await txn.runAsync(
      'UPDATE vessels SET name = ?, propulsion = ?, loa_m = ?, gt = ?, flag = ? WHERE id = ?',
      c.vessel.name,
      c.vessel.propulsion,
      c.vessel.loaM,
      c.vessel.gt,
      c.vessel.flag,
      c.vessel.id,
    );
    await txn.runAsync(
      'UPDATE engagements SET position = ?, start_date = ?, captain = ?, company = ? WHERE id = ?',
      c.engagement.position,
      c.engagement.startDate,
      c.engagement.captain,
      c.engagement.company,
      c.engagement.id,
    );
  });
}

/** Ends the current engagement and starts one on another yacht. Past voyages and logs stay with the old one. */
export async function changeVessel(input: { vesselName: string; propulsion: Propulsion; loaM: number | null; position: string; startDate: string }): Promise<void> {
  const now = Date.now();
  const vesselId = newId();
  await transaction(async (txn) => {
    await txn.runAsync('UPDATE engagements SET end_date = ? WHERE end_date IS NULL', input.startDate);
    await txn.runAsync('INSERT INTO vessels (id, name, propulsion, loa_m, created_at) VALUES (?, ?, ?, ?, ?)', vesselId, input.vesselName, input.propulsion, input.loaM, now);
    await txn.runAsync(
      'INSERT INTO engagements (id, vessel_id, position, start_date, created_at) VALUES (?, ?, ?, ?, ?)',
      newId(),
      vesselId,
      input.position,
      input.startDate,
      now,
    );
  });
}

// ── Voyages and track ─────────────────────────────────────────────────────────

export async function startVoyage(engagementId: string, startedAt: number, source: VoyageSource): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync("INSERT INTO voyages (id, engagement_id, started_at, source, status) VALUES (?, ?, ?, ?, 'live')", id, engagementId, startedAt, source);
  return id;
}

export async function addFix(voyageId: string, f: Fix): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO track_points (voyage_id, ts, lat, lon, accuracy) VALUES (?, ?, ?, ?, ?)', voyageId, f.ts, f.lat, f.lon, f.accuracy ?? null);
}

export async function getTrack(voyageId: string): Promise<Fix[]> {
  const db = await getDb();
  return db.getAllAsync<Fix>('SELECT ts, lat, lon, accuracy FROM track_points WHERE voyage_id = ? ORDER BY ts', voyageId);
}

/** The voyage in progress, if the app was closed mid-passage. */
export async function getLiveVoyage(): Promise<Voyage | null> {
  return firstVoyage("WHERE vg.status = 'live' ORDER BY vg.started_at DESC");
}

/** The stopped-but-unconfirmed voyage, if any. */
export async function getDraftVoyage(): Promise<Voyage | null> {
  return firstVoyage("WHERE vg.status = 'draft' ORDER BY vg.started_at DESC");
}

export async function getVoyage(id: string): Promise<Voyage | null> {
  return firstVoyage('WHERE vg.id = ?', id);
}

export async function stopVoyage(id: string, endedAt: number, s: TrackSummary, names: { from: string | null; to: string | null }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE voyages SET ended_at = ?, from_name = ?, to_name = ?,
       start_lat = ?, start_lon = ?, end_lat = ?, end_lon = ?,
       distance_nm = ?, duration_min = ?, underway_min = ?, night_min = ?, avg_kn = ?, max_kn = ?,
       overnight = ?, status = 'draft'
     WHERE id = ?`,
    endedAt,
    names.from,
    names.to,
    s.first?.lat ?? null,
    s.first?.lon ?? null,
    s.last?.lat ?? null,
    s.last?.lon ?? null,
    s.distanceNm,
    s.durationMin,
    s.underwayMin,
    s.nightMin,
    s.avgKn,
    s.maxKn,
    s.overnight ? 1 : 0,
    id,
  );
}

export async function confirmVoyage(id: string, names: { from: string; to: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE voyages SET from_name = ?, to_name = ?, status = 'confirmed' WHERE id = ?", names.from, names.to, id);
}

export async function deleteVoyage(id: string): Promise<void> {
  await transaction(async (txn) => {
    await txn.runAsync('DELETE FROM track_points WHERE voyage_id = ?', id);
    await txn.runAsync('DELETE FROM voyages WHERE id = ?', id);
  });
}

export async function listVoyages(limit = 200): Promise<Voyage[]> {
  return allVoyages("WHERE vg.status NOT IN ('live', 'draft') ORDER BY vg.started_at DESC LIMIT ?", limit);
}

/** Where the last confirmed voyage ended, for the "jump" sanity check and the simulator. */
export async function lastKnownPosition(): Promise<{ lat: number; lon: number } | null> {
  const db = await getDb();
  return db.getFirstAsync<{ lat: number; lon: number }>(
    "SELECT end_lat AS lat, end_lon AS lon FROM voyages WHERE status NOT IN ('live', 'draft') AND end_lat IS NOT NULL ORDER BY ended_at DESC LIMIT 1",
  );
}

// ── Experience ────────────────────────────────────────────────────────────────

export type Experience = {
  nm: number;
  underwayHours: number;
  nightHours: number;
  voyages: number;
  seaDays: number;
  longestNm: number;
  largestLoaM: number | null;
  motorNm: number;
  sailNm: number;
  vessels: number;
  since: string | null;
  /** NM per month for the last 12 months, oldest first; label is "Nov 2025". */
  months: { label: string; nm: number }[];
  weekNm: number;
  bySize: Breakdown[];
  byPosition: Breakdown[];
  byPassage: Breakdown[];
  overnightPassages: number;
};

/** One row of a breakdown: miles and hours underway in a category. */
export type Breakdown = { label: string; nm: number; hours: number; voyages: number };

/** Length bands crew and authorities talk in. Unknown length gets its own row. */
export const SIZE_BANDS: { label: string; max: number }[] = [
  { label: 'Under 24 m', max: 24 },
  { label: '24–40 m', max: 40 },
  { label: '40–60 m', max: 60 },
  { label: '60 m and over', max: Infinity },
];

function sizeBand(loa: number | null): string {
  if (!loa) return 'Length not set';
  return SIZE_BANDS.find((b) => loa < b.max)!.label;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getExperience(): Promise<Experience> {
  const db = await getDb();
  const done = "vg.status NOT IN ('live', 'draft')";
  const t = await db.getFirstAsync<{ nm: number; uw: number; night: number; n: number; longest: number; motor: number; sail: number }>(
    `SELECT COALESCE(SUM(distance_nm), 0) AS nm, COALESCE(SUM(underway_min), 0) AS uw, COALESCE(SUM(night_min), 0) AS night,
            COUNT(*) AS n, COALESCE(MAX(distance_nm), 0) AS longest,
            COALESCE(SUM(CASE WHEN v.propulsion = 'motor' THEN distance_nm END), 0) AS motor,
            COALESCE(SUM(CASE WHEN v.propulsion = 'sail' THEN distance_nm END), 0) AS sail
       FROM voyages vg JOIN engagements e ON e.id = vg.engagement_id JOIN vessels v ON v.id = e.vessel_id
      WHERE ${done}`,
  );
  const vs = await db.getFirstAsync<{ n: number; loa: number | null; since: string | null }>(
    'SELECT COUNT(DISTINCT e.vessel_id) AS n, MAX(v.loa_m) AS loa, MIN(e.start_date) AS since FROM engagements e JOIN vessels v ON v.id = e.vessel_id',
  );
  const rows = await db.getAllAsync<{ started_at: number; distance_nm: number; underway_min: number; night_min: number; overnight: number; loa_m: number | null; position: string }>(
    `SELECT vg.started_at, vg.distance_nm, vg.underway_min, vg.night_min, vg.overnight, v.loa_m, e.position
       FROM voyages vg JOIN engagements e ON e.id = vg.engagement_id JOIN vessels v ON v.id = e.vessel_id
      WHERE ${done} AND vg.underway_min > 0`,
  );
  const size = new Map<string, Breakdown>();
  const pos = new Map<string, Breakdown>();
  const passage = new Map<string, Breakdown>();
  const add = (m: Map<string, Breakdown>, label: string, r: { distance_nm: number; underway_min: number }) => {
    const b = m.get(label) ?? { label, nm: 0, hours: 0, voyages: 0 };
    b.nm += r.distance_nm;
    b.hours += r.underway_min / 60;
    b.voyages += 1;
    m.set(label, b);
  };
  let overnightPassages = 0;
  for (const r of rows) {
    add(size, sizeBand(r.loa_m), r);
    add(pos, r.position, r);
    add(passage, r.overnight ? 'Overnight' : r.night_min > 0 ? 'Night' : 'Day', r);
    if (r.overnight) overnightPassages++;
  }
  const bySize = [...SIZE_BANDS.map((b) => b.label), 'Length not set'].flatMap((l) => (size.has(l) ? [size.get(l)!] : []));
  const byPassage = ['Day', 'Night', 'Overnight'].flatMap((l) => (passage.has(l) ? [passage.get(l)!] : []));
  const byPosition = [...pos.values()].sort((a, b) => b.nm - a.nm);

  const now = new Date();
  const months: { label: string; nm: number; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: `${MON[d.getMonth()]} ${d.getFullYear()}`, nm: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
  }
  const days = new Set<string>();
  const weekAgo = now.getTime() - 7 * 86400000;
  let weekNm = 0;
  for (const r of rows) {
    const d = new Date(r.started_at);
    days.add(localDate(d));
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.nm += r.distance_nm;
    if (r.started_at >= weekAgo) weekNm += r.distance_nm;
  }

  return {
    nm: t?.nm ?? 0,
    underwayHours: (t?.uw ?? 0) / 60,
    nightHours: (t?.night ?? 0) / 60,
    voyages: t?.n ?? 0,
    seaDays: days.size,
    longestNm: t?.longest ?? 0,
    largestLoaM: vs?.loa ?? null,
    motorNm: t?.motor ?? 0,
    sailNm: t?.sail ?? 0,
    vessels: vs?.n ?? 0,
    since: vs?.since ?? null,
    months: months.map(({ label, nm }) => ({ label, nm })),
    weekNm,
    bySize,
    byPosition,
    byPassage,
    overnightPassages,
  };
}

// ── Daily log ─────────────────────────────────────────────────────────────────

export async function getLog(engagementId: string, date: string): Promise<LogEntry | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<LogRow>('SELECT * FROM log_entries WHERE engagement_id = ? AND date = ?', engagementId, date);
  return r ? toLog(r) : null;
}

export async function saveLog(e: Omit<LogEntry, 'id' | 'updatedAt'> & { id?: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO log_entries (id, engagement_id, date, activities, duties, notes, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (engagement_id, date) DO UPDATE SET
       activities = excluded.activities, duties = excluded.duties, notes = excluded.notes,
       status = excluded.status, updated_at = excluded.updated_at`,
    e.id ?? newId(),
    e.engagementId,
    e.date,
    JSON.stringify(e.activities),
    JSON.stringify(e.duties),
    e.notes,
    e.status,
    Date.now(),
  );
}

export async function listLogs(limit = 60): Promise<LogEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LogRow & { vessel_name: string }>(
    `SELECT l.*, v.name AS vessel_name FROM log_entries l
       JOIN engagements e ON e.id = l.engagement_id JOIN vessels v ON v.id = e.vessel_id
      ORDER BY l.date DESC LIMIT ?`,
    limit,
  );
  return rows.map((r) => ({ ...toLog(r), vesselName: r.vessel_name }));
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocs(): Promise<Doc[]> {
  const db = await getDb();
  // Soonest expiry first; documents without expiry last.
  return db.getAllAsync<Doc>('SELECT id, name, issuer, number, expires FROM documents ORDER BY expires IS NULL, expires, name');
}

export async function getDoc(id: string): Promise<Doc | null> {
  const db = await getDb();
  return db.getFirstAsync<Doc>('SELECT id, name, issuer, number, expires FROM documents WHERE id = ?', id);
}

export async function saveDoc(d: Omit<Doc, 'id'> & { id?: string }): Promise<string> {
  const db = await getDb();
  const id = d.id ?? newId();
  await db.runAsync(
    `INSERT INTO documents (id, name, issuer, number, expires, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, issuer = excluded.issuer, number = excluded.number, expires = excluded.expires`,
    id,
    d.name,
    d.issuer,
    d.number,
    d.expires,
    Date.now(),
  );
  return id;
}

export async function deleteDoc(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE id = ?', id);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', key, value);
}

// ── Row mapping ───────────────────────────────────────────────────────────────

type EngagementRow = {
  id: string;
  vessel_id: string;
  position: string;
  start_date: string;
  end_date: string | null;
  captain: string | null;
  company: string | null;
};
type VesselRow = { v_id: string; v_name: string; propulsion: Propulsion; loa_m: number | null; gt: number | null; flag: string | null };
type VoyageRow = {
  id: string;
  engagement_id: string;
  vessel_name: string;
  started_at: number;
  ended_at: number | null;
  from_name: string | null;
  to_name: string | null;
  start_lat: number | null;
  start_lon: number | null;
  end_lat: number | null;
  end_lon: number | null;
  distance_nm: number;
  duration_min: number;
  underway_min: number;
  night_min: number;
  avg_kn: number;
  max_kn: number;
  overnight: number;
  source: VoyageSource;
  status: VoyageStatus;
};
type LogRow = {
  id: string;
  engagement_id: string;
  date: string;
  activities: string;
  duties: string;
  notes: string;
  status: RecordStatus;
  updated_at: number;
};

const VOYAGE_SELECT = `SELECT vg.*, v.name AS vessel_name FROM voyages vg
  JOIN engagements e ON e.id = vg.engagement_id JOIN vessels v ON v.id = e.vessel_id `;

async function firstVoyage(where: string, ...params: (string | number)[]): Promise<Voyage | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<VoyageRow>(VOYAGE_SELECT + where, ...params);
  return r ? toVoyage(r) : null;
}

async function allVoyages(where: string, ...params: (string | number)[]): Promise<Voyage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<VoyageRow>(VOYAGE_SELECT + where, ...params);
  return rows.map(toVoyage);
}

function toEngagement(r: EngagementRow): Engagement {
  return { id: r.id, vesselId: r.vessel_id, position: r.position, startDate: r.start_date, endDate: r.end_date, captain: r.captain, company: r.company };
}

function toVessel(r: VesselRow): Vessel {
  return { id: r.v_id, name: r.v_name, propulsion: r.propulsion, loaM: r.loa_m, gt: r.gt, flag: r.flag };
}

function toVoyage(r: VoyageRow): Voyage {
  return {
    id: r.id,
    engagementId: r.engagement_id,
    vesselName: r.vessel_name,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    fromName: r.from_name,
    toName: r.to_name,
    start: r.start_lat != null && r.start_lon != null ? { lat: r.start_lat, lon: r.start_lon } : null,
    end: r.end_lat != null && r.end_lon != null ? { lat: r.end_lat, lon: r.end_lon } : null,
    distanceNm: r.distance_nm,
    durationMin: r.duration_min,
    underwayMin: r.underway_min,
    nightMin: r.night_min,
    avgKn: r.avg_kn,
    maxKn: r.max_kn,
    overnight: r.overnight === 1,
    source: r.source,
    status: r.status,
  };
}

function toLog(r: LogRow): LogEntry {
  return {
    id: r.id,
    engagementId: r.engagement_id,
    date: r.date,
    activities: JSON.parse(r.activities) as string[],
    duties: JSON.parse(r.duties) as string[],
    notes: r.notes,
    status: r.status,
    updatedAt: r.updated_at,
  };
}
