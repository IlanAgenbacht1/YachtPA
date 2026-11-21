/**
 * Reads and writes domain records. Row ↔ domain mapping lives here and only
 * here. Requested/signed records are locked: every update path checks.
 */
import { isLocked, type Doc, type Engagement, type Fix, type LogEntry, type Profile, type RecordStatus, type Vessel, type Voyage } from '@/domain/types';

import { db, newId } from './db';

export class LockedError extends Error {
  constructor() {
    super('This record has been sent for sign-off and can no longer be edited.');
  }
}

const json = <T,>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

/* ---------- key/value ---------- */

export function getKv(key: string): string | null {
  return db().getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key)?.value ?? null;
}

export function setKv(key: string, value: string | null) {
  if (value === null) db().runSync('DELETE FROM kv WHERE key = ?', key);
  else db().runSync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

/* ---------- profile ---------- */

type ProfileRow = { name: string; nationality: string; home_country: string; email: string; phone: string; onboarded_at: number | null };

export async function getProfile(): Promise<Profile> {
  const r = await db().getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id = 1');
  return {
    name: r?.name ?? '',
    nationality: r?.nationality ?? '',
    homeCountry: r?.home_country ?? '',
    email: r?.email ?? '',
    phone: r?.phone ?? '',
    onboardedAt: r?.onboarded_at ?? null,
  };
}

export async function saveProfile(p: Profile) {
  await db().runAsync(
    'UPDATE profile SET name = ?, nationality = ?, home_country = ?, email = ?, phone = ?, onboarded_at = ? WHERE id = 1',
    p.name,
    p.nationality,
    p.homeCountry,
    p.email,
    p.phone,
    p.onboardedAt,
  );
}

/* ---------- vessels and engagements ---------- */

type VesselRow = {
  id: string; name: string; category: string; propulsion: 'motor' | 'sail'; loa_m: number | null; gt: number | null;
  flag: string; imo: string; official_number: string; home_port: string; created_at: number;
};

const toVessel = (r: VesselRow): Vessel => ({
  id: r.id,
  name: r.name,
  category: r.category,
  propulsion: r.propulsion,
  loaM: r.loa_m,
  gt: r.gt,
  flag: r.flag,
  imo: r.imo,
  officialNumber: r.official_number,
  homePort: r.home_port,
  createdAt: r.created_at,
});

export async function listVessels(): Promise<Vessel[]> {
  return (await db().getAllAsync<VesselRow>('SELECT * FROM vessel ORDER BY created_at')).map(toVessel);
}

export async function upsertVessel(v: Omit<Vessel, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<string> {
  const id = v.id ?? newId();
  await db().runAsync(
    `INSERT INTO vessel (id, name, category, propulsion, loa_m, gt, flag, imo, official_number, home_port, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, propulsion = excluded.propulsion,
       loa_m = excluded.loa_m, gt = excluded.gt, flag = excluded.flag, imo = excluded.imo,
       official_number = excluded.official_number, home_port = excluded.home_port`,
    id, v.name, v.category, v.propulsion, v.loaM, v.gt, v.flag, v.imo, v.officialNumber, v.homePort, v.createdAt ?? Date.now(),
  );
  return id;
}

/** Only a vessel with no engagements can be deleted, so history is never orphaned. */
export async function deleteVessel(id: string): Promise<boolean> {
  const used = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM engagement WHERE vessel_id = ?', id);
  if ((used?.n ?? 0) > 0) return false;
  await db().runAsync('DELETE FROM vessel WHERE id = ?', id);
  return true;
}

type EngagementRow = {
  id: string; vessel_id: string; position: string; start_date: string; end_date: string | null;
  captain: string; company: string; created_at: number;
};

const toEngagement = (r: EngagementRow): Engagement => ({
  id: r.id,
  vesselId: r.vessel_id,
  position: r.position,
  startDate: r.start_date,
  endDate: r.end_date,
  captain: r.captain,
  company: r.company,
  createdAt: r.created_at,
});

export async function listEngagements(): Promise<Engagement[]> {
  return (await db().getAllAsync<EngagementRow>('SELECT * FROM engagement ORDER BY start_date')).map(toEngagement);
}

export async function upsertEngagement(e: Omit<Engagement, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<string> {
  const id = e.id ?? newId();
  await db().runAsync(
    `INSERT INTO engagement (id, vessel_id, position, start_date, end_date, captain, company, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET vessel_id = excluded.vessel_id, position = excluded.position,
       start_date = excluded.start_date, end_date = excluded.end_date, captain = excluded.captain, company = excluded.company`,
    id, e.vesselId, e.position, e.startDate, e.endDate, e.captain, e.company, e.createdAt ?? Date.now(),
  );
  return id;
}

export async function deleteEngagement(id: string): Promise<boolean> {
  const v = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM voyage WHERE engagement_id = ?', id);
  const l = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM log_entry WHERE engagement_id = ?', id);
  if ((v?.n ?? 0) + (l?.n ?? 0) > 0) return false;
  await db().runAsync('DELETE FROM engagement WHERE id = ?', id);
  return true;
}

/* ---------- voyages and track ---------- */

type VoyageRow = {
  id: string; engagement_id: string; started_at: number; ended_at: number | null;
  start_lat: number | null; start_lon: number | null; end_lat: number | null; end_lon: number | null;
  start_place: string; end_place: string; distance_nm: number; direct_nm: number; duration_min: number;
  underway_min: number; night_min: number; avg_kn: number; max_kn: number; passage_type: Voyage['passageType'];
  as_skipper: number; source: Voyage['source']; status: RecordStatus; flags: string; segments: string; notes: string; updated_at: number;
};

const toVoyage = (r: VoyageRow): Voyage => ({
  id: r.id,
  engagementId: r.engagement_id,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  startLat: r.start_lat,
  startLon: r.start_lon,
  endLat: r.end_lat,
  endLon: r.end_lon,
  startPlace: r.start_place,
  endPlace: r.end_place,
  distanceNm: r.distance_nm,
  directNm: r.direct_nm,
  durationMin: r.duration_min,
  underwayMin: r.underway_min,
  nightMin: r.night_min,
  avgKn: r.avg_kn,
  maxKn: r.max_kn,
  passageType: r.passage_type,
  asSkipper: !!r.as_skipper,
  source: r.source,
  status: r.status,
  flags: json(r.flags, []),
  segments: json(r.segments, []),
  notes: r.notes,
  updatedAt: r.updated_at,
});

export async function listVoyages(): Promise<Voyage[]> {
  return (await db().getAllAsync<VoyageRow>('SELECT * FROM voyage ORDER BY started_at DESC')).map(toVoyage);
}

export async function getVoyage(id: string): Promise<Voyage | null> {
  const r = await db().getFirstAsync<VoyageRow>('SELECT * FROM voyage WHERE id = ?', id);
  return r ? toVoyage(r) : null;
}

export async function saveVoyage(v: Voyage, opts: { force?: boolean } = {}) {
  const existing = await db().getFirstAsync<{ status: RecordStatus }>('SELECT status FROM voyage WHERE id = ?', v.id);
  if (existing && isLocked(existing.status) && !opts.force) throw new LockedError();
  await db().runAsync(
    `INSERT INTO voyage (id, engagement_id, started_at, ended_at, start_lat, start_lon, end_lat, end_lon, start_place, end_place,
       distance_nm, direct_nm, duration_min, underway_min, night_min, avg_kn, max_kn, passage_type, as_skipper, source, status,
       flags, segments, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET engagement_id = excluded.engagement_id, started_at = excluded.started_at, ended_at = excluded.ended_at,
       start_lat = excluded.start_lat, start_lon = excluded.start_lon, end_lat = excluded.end_lat, end_lon = excluded.end_lon,
       start_place = excluded.start_place, end_place = excluded.end_place, distance_nm = excluded.distance_nm,
       direct_nm = excluded.direct_nm, duration_min = excluded.duration_min, underway_min = excluded.underway_min,
       night_min = excluded.night_min, avg_kn = excluded.avg_kn, max_kn = excluded.max_kn, passage_type = excluded.passage_type,
       as_skipper = excluded.as_skipper, source = excluded.source, status = excluded.status, flags = excluded.flags,
       segments = excluded.segments, notes = excluded.notes, updated_at = excluded.updated_at`,
    v.id, v.engagementId, v.startedAt, v.endedAt, v.startLat, v.startLon, v.endLat, v.endLon, v.startPlace, v.endPlace,
    v.distanceNm, v.directNm, v.durationMin, v.underwayMin, v.nightMin, v.avgKn, v.maxKn, v.passageType, v.asSkipper ? 1 : 0,
    v.source, v.status, JSON.stringify(v.flags), JSON.stringify(v.segments), v.notes, Date.now(),
  );
}

export async function deleteVoyage(id: string) {
  const existing = await db().getFirstAsync<{ status: RecordStatus }>('SELECT status FROM voyage WHERE id = ?', id);
  if (existing && isLocked(existing.status)) throw new LockedError();
  await db().withTransactionAsync(async () => {
    await db().runAsync('DELETE FROM track_point WHERE voyage_id = ?', id);
    await db().runAsync('DELETE FROM voyage WHERE id = ?', id);
  });
}

/** Sync so the background task can call it without awaiting the JS event loop. */
export function addTrackPoints(voyageId: string, fixes: Fix[]) {
  if (!fixes.length) return;
  const d = db();
  d.withTransactionSync(() => {
    for (const f of fixes) {
      d.runSync(
        'INSERT OR IGNORE INTO track_point (voyage_id, ts, lat, lon, accuracy, speed) VALUES (?, ?, ?, ?, ?, ?)',
        voyageId, Math.round(f.ts), f.lat, f.lon, f.accuracy, f.speed,
      );
    }
  });
}

export async function getTrack(voyageId: string): Promise<Fix[]> {
  return db().getAllAsync<Fix>('SELECT ts, lat, lon, accuracy, speed FROM track_point WHERE voyage_id = ? ORDER BY ts', voyageId);
}

export async function trackStats(voyageId: string): Promise<{ n: number; last: Fix | null }> {
  const n = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM track_point WHERE voyage_id = ?', voyageId);
  const last = await db().getFirstAsync<Fix>('SELECT ts, lat, lon, accuracy, speed FROM track_point WHERE voyage_id = ? ORDER BY ts DESC LIMIT 1', voyageId);
  return { n: n?.n ?? 0, last };
}

/* ---------- log entries ---------- */

type EntryRow = {
  id: string; engagement_id: string; date: string; location: string; activities: string; duties: string; watches: string;
  notes: string; voice_uri: string | null; transcript: string; status: RecordStatus; updated_at: number;
};

const toEntry = (r: EntryRow): LogEntry => ({
  id: r.id,
  engagementId: r.engagement_id,
  date: r.date,
  location: r.location,
  activities: json(r.activities, []),
  duties: json(r.duties, []),
  watches: json(r.watches, []),
  notes: r.notes,
  voiceUri: r.voice_uri,
  transcript: r.transcript,
  status: r.status,
  updatedAt: r.updated_at,
});

export async function listEntries(): Promise<LogEntry[]> {
  return (await db().getAllAsync<EntryRow>('SELECT * FROM log_entry ORDER BY date DESC')).map(toEntry);
}

/** One entry per day per engagement (SCOPE §6): saving the same day updates it. */
export async function saveEntry(e: Omit<LogEntry, 'id' | 'updatedAt'> & { id?: string }): Promise<string> {
  const existing = await db().getFirstAsync<{ id: string; status: RecordStatus }>(
    'SELECT id, status FROM log_entry WHERE id = ? OR (engagement_id = ? AND date = ?)',
    e.id ?? '', e.engagementId, e.date,
  );
  if (existing && isLocked(existing.status)) throw new LockedError();
  const id = existing?.id ?? e.id ?? newId();
  await db().runAsync(
    `INSERT INTO log_entry (id, engagement_id, date, location, activities, duties, watches, notes, voice_uri, transcript, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET engagement_id = excluded.engagement_id, date = excluded.date, location = excluded.location,
       activities = excluded.activities, duties = excluded.duties, watches = excluded.watches, notes = excluded.notes,
       voice_uri = excluded.voice_uri, transcript = excluded.transcript, status = excluded.status, updated_at = excluded.updated_at`,
    id, e.engagementId, e.date, e.location, JSON.stringify(e.activities), JSON.stringify(e.duties), JSON.stringify(e.watches),
    e.notes, e.voiceUri, e.transcript, e.status, Date.now(),
  );
  return id;
}

export async function deleteEntry(id: string) {
  const existing = await db().getFirstAsync<{ status: RecordStatus }>('SELECT status FROM log_entry WHERE id = ?', id);
  if (existing && isLocked(existing.status)) throw new LockedError();
  await db().runAsync('DELETE FROM log_entry WHERE id = ?', id);
}

/* ---------- documents ---------- */

type DocRow = {
  id: string; type: Doc['type']; name: string; issuer: string; number: string; issue_date: string | null; expiry_date: string | null;
  file_uri: string | null; file_mime: string | null; superseded_by: string | null; created_at: number;
};

const toDoc = (r: DocRow): Doc => ({
  id: r.id,
  type: r.type,
  name: r.name,
  issuer: r.issuer,
  number: r.number,
  issueDate: r.issue_date,
  expiryDate: r.expiry_date,
  fileUri: r.file_uri,
  fileMime: r.file_mime,
  supersededBy: r.superseded_by,
  createdAt: r.created_at,
});

export async function listDocs(): Promise<Doc[]> {
  return (await db().getAllAsync<DocRow>('SELECT * FROM document ORDER BY created_at DESC')).map(toDoc);
}

export async function saveDoc(d: Omit<Doc, 'id' | 'createdAt' | 'supersededBy'> & { id?: string; createdAt?: number; supersededBy?: string | null }): Promise<string> {
  const id = d.id ?? newId();
  await db().runAsync(
    `INSERT INTO document (id, type, name, issuer, number, issue_date, expiry_date, file_uri, file_mime, superseded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET type = excluded.type, name = excluded.name, issuer = excluded.issuer, number = excluded.number,
       issue_date = excluded.issue_date, expiry_date = excluded.expiry_date, file_uri = excluded.file_uri,
       file_mime = excluded.file_mime, superseded_by = excluded.superseded_by`,
    id, d.type, d.name, d.issuer, d.number, d.issueDate, d.expiryDate, d.fileUri, d.fileMime, d.supersededBy ?? null, d.createdAt ?? Date.now(),
  );
  return id;
}

/** Adds the renewed copy and keeps the old one as history. */
export async function renewDoc(oldId: string, next: Parameters<typeof saveDoc>[0]): Promise<string> {
  let id = '';
  await db().withTransactionAsync(async () => {
    id = await saveDoc({ ...next, id: undefined, supersededBy: null });
    await db().runAsync('UPDATE document SET superseded_by = ? WHERE id = ?', id, oldId);
  });
  return id;
}

export async function deleteDoc(id: string) {
  await db().withTransactionAsync(async () => {
    // Re-link history around the deleted copy.
    const row = await db().getFirstAsync<{ superseded_by: string | null }>('SELECT superseded_by FROM document WHERE id = ?', id);
    await db().runAsync('UPDATE document SET superseded_by = ? WHERE superseded_by = ?', row?.superseded_by ?? null, id);
    await db().runAsync('DELETE FROM document WHERE id = ?', id);
  });
}

/* ---------- everything ---------- */

export async function exportAll() {
  return {
    format: 'yachtpa-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
    vessels: await listVessels(),
    engagements: await listEngagements(),
    voyages: await listVoyages(),
    logEntries: await listEntries(),
    documents: await listDocs(),
    trackPoints: await db().getAllAsync('SELECT * FROM track_point ORDER BY voyage_id, ts'),
  };
}

export async function wipeAll() {
  await db().withTransactionAsync(async () => {
    for (const t of ['track_point', 'voyage', 'log_entry', 'document', 'engagement', 'vessel', 'kv']) {
      await db().runAsync(`DELETE FROM ${t}`);
    }
    await db().runAsync("UPDATE profile SET name = '', nationality = '', home_country = '', email = '', phone = '', onboarded_at = NULL");
  });
}
