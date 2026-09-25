/**
 * Voyages and their tracks. `appendFixes` is the hot path: the background
 * location task calls it for every batch of fixes, so it filters against the
 * last accepted point and keeps the running distance on the voyage row rather
 * than re-reading the whole track.
 */
import { acceptFix, haversineNm, placeLabel, summarize, type Fix, type PassageKind } from '@/domain';

import { getDb, newId } from './database';

export type VoyageStatus = 'live' | 'draft' | 'confirmed' | 'requested' | 'signed' | 'discarded';
export type VoyageSource = 'gps' | 'sim' | 'manual';

export type Voyage = {
  id: string;
  engagementId: string;
  status: VoyageStatus;
  source: VoyageSource;
  startedAt: number;
  endedAt: number | null;
  start: { lat: number; lon: number; place: string } | null;
  end: { lat: number; lon: number; place: string } | null;
  nm: number;
  durationMin: number | null;
  underwayMin: number | null;
  nightMin: number | null;
  avgKn: number | null;
  maxKn: number | null;
  passage: PassageKind | null;
  rawFixes: number;
  fixes: number;
};

type Row = {
  id: string;
  engagement_id: string;
  status: VoyageStatus;
  source: VoyageSource;
  started_at: number;
  ended_at: number | null;
  start_lat: number | null;
  start_lon: number | null;
  start_place: string | null;
  end_lat: number | null;
  end_lon: number | null;
  end_place: string | null;
  nm: number;
  duration_min: number | null;
  underway_min: number | null;
  night_min: number | null;
  avg_kn: number | null;
  max_kn: number | null;
  passage: PassageKind | null;
  raw_fixes: number;
  fixes: number;
};

function toVoyage(r: Row): Voyage {
  return {
    id: r.id,
    engagementId: r.engagement_id,
    status: r.status,
    source: r.source,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    start: r.start_lat !== null && r.start_lon !== null ? { lat: r.start_lat, lon: r.start_lon, place: r.start_place ?? '' } : null,
    end: r.end_lat !== null && r.end_lon !== null ? { lat: r.end_lat, lon: r.end_lon, place: r.end_place ?? '' } : null,
    nm: r.nm,
    durationMin: r.duration_min,
    underwayMin: r.underway_min,
    nightMin: r.night_min,
    avgKn: r.avg_kn,
    maxKn: r.max_kn,
    passage: r.passage,
    rawFixes: r.raw_fixes,
    fixes: r.fixes,
  };
}

type PointRow = { ts: number; lat: number; lon: number; accuracy: number | null; speed_kn: number | null; heading: number | null };

function toFix(p: PointRow): Fix {
  return { ts: p.ts, lat: p.lat, lon: p.lon, accuracy: p.accuracy, speedKn: p.speed_kn, heading: p.heading };
}

export async function getVoyage(id: string): Promise<Voyage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM voyages WHERE id = ?', id);
  return row ? toVoyage(row) : null;
}

/** The one voyage being tracked right now, if any. */
export async function getLiveVoyage(): Promise<Voyage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT * FROM voyages WHERE status = 'live' ORDER BY started_at DESC LIMIT 1");
  return row ? toVoyage(row) : null;
}

/** A stopped voyage still waiting for the user's confirmation. */
export async function getDraftVoyage(): Promise<Voyage | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>("SELECT * FROM voyages WHERE status = 'draft' ORDER BY ended_at DESC LIMIT 1");
  return row ? toVoyage(row) : null;
}

export async function startVoyage(engagementId: string, source: VoyageSource, startedAt = Date.now()): Promise<Voyage> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO voyages (id, engagement_id, status, source, started_at, created_at, updated_at)
     VALUES (?, ?, 'live', ?, ?, ?, ?)`,
    id,
    engagementId,
    source,
    startedAt,
    startedAt,
    startedAt,
  );
  const v = await getVoyage(id);
  if (!v) throw new Error('voyage not found after insert');
  return v;
}

/** Stores a batch of fixes, marking each as accepted or not, and advances the voyage's running distance. */
export async function appendFixes(voyageId: string, fixes: readonly Fix[]): Promise<{ accepted: number }> {
  if (fixes.length === 0) return { accepted: 0 };
  const db = await getDb();
  let accepted = 0;
  await db.withTransactionAsync(async () => {
    const lastRow = await db.getFirstAsync<PointRow>(
      'SELECT ts, lat, lon, accuracy, speed_kn, heading FROM track_points WHERE voyage_id = ? AND accepted = 1 ORDER BY ts DESC LIMIT 1',
      voyageId,
    );
    let prev: Fix | null = lastRow ? toFix(lastRow) : null;
    let addedNm = 0;
    let first: Fix | null = null;
    for (const f of fixes) {
      const ok = acceptFix(prev, f);
      await db.runAsync(
        'INSERT INTO track_points (voyage_id, ts, lat, lon, accuracy, speed_kn, heading, accepted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        voyageId,
        f.ts,
        f.lat,
        f.lon,
        f.accuracy,
        f.speedKn,
        f.heading,
        ok ? 1 : 0,
      );
      if (ok) {
        if (prev) addedNm += haversineNm(prev, f);
        else if (!lastRow) first = f;
        prev = f;
        accepted++;
      }
    }
    const last = prev;
    await db.runAsync(
      `UPDATE voyages SET
         nm = nm + ?,
         raw_fixes = raw_fixes + ?,
         fixes = fixes + ?,
         start_lat = COALESCE(start_lat, ?), start_lon = COALESCE(start_lon, ?), start_place = COALESCE(start_place, ?),
         end_lat = COALESCE(?, end_lat), end_lon = COALESCE(?, end_lon),
         updated_at = ?
       WHERE id = ?`,
      addedNm,
      fixes.length,
      accepted,
      first?.lat ?? null,
      first?.lon ?? null,
      first ? placeLabel(first) : null,
      last?.lat ?? null,
      last?.lon ?? null,
      Date.now(),
      voyageId,
    );
  });
  return { accepted };
}

export async function getTrack(voyageId: string, acceptedOnly = true): Promise<Fix[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PointRow>(
    `SELECT ts, lat, lon, accuracy, speed_kn, heading FROM track_points WHERE voyage_id = ? ${acceptedOnly ? 'AND accepted = 1' : ''} ORDER BY ts ASC`,
    voyageId,
  );
  return rows.map(toFix);
}

/** What the live screen shows each second. One row read plus the last two accepted points. */
export type LiveSnapshot = {
  voyage: Voyage;
  /** Track time, not wall-clock: last accepted fix minus start. Identical for real GPS, coherent for simulated tracks. */
  elapsedMin: number;
  speedKn: number;
  headingDeg: number | null;
  accuracyM: number | null;
  lastFixTs: number | null;
};

export async function getLiveSnapshot(voyageId: string): Promise<LiveSnapshot | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM voyages WHERE id = ?', voyageId);
  if (!row) return null;
  const voyage = toVoyage(row);
  const last = await db.getAllAsync<PointRow>(
    'SELECT ts, lat, lon, accuracy, speed_kn, heading FROM track_points WHERE voyage_id = ? AND accepted = 1 ORDER BY ts DESC LIMIT 2',
    voyageId,
  );
  if (last.length === 0) return { voyage, elapsedMin: 0, speedKn: 0, headingDeg: null, accuracyM: null, lastFixTs: null };
  const a = toFix(last[0]);
  const b = last[1] ? toFix(last[1]) : null;
  let speedKn = a.speedKn ?? 0;
  if (a.speedKn === null && b) speedKn = (haversineNm(b, a) / Math.max(1, a.ts - b.ts)) * 3_600_000;
  const headingDeg = a.heading ?? null;
  return {
    voyage,
    elapsedMin: Math.max(0, (a.ts - voyage.startedAt) / 60_000),
    speedKn,
    headingDeg,
    accuracyM: a.accuracy,
    lastFixTs: a.ts,
  };
}

/** Ends tracking: computes the stats from the track and moves the voyage to `draft` for confirmation. */
export async function stopVoyage(voyageId: string, endedAt = Date.now()): Promise<Voyage> {
  const db = await getDb();
  const track = await getTrack(voyageId, false);
  const stats = summarize(track);
  const accepted = track.length ? await getTrack(voyageId, true) : [];
  const first = accepted[0] ?? null;
  const last = accepted[accepted.length - 1] ?? null;
  const ended = last ? Math.max(last.ts, endedAt) : endedAt;
  await db.runAsync(
    `UPDATE voyages SET
       status = 'draft', ended_at = ?,
       start_lat = ?, start_lon = ?, start_place = ?,
       end_lat = ?, end_lon = ?, end_place = ?,
       nm = ?, duration_min = ?, underway_min = ?, night_min = ?, avg_kn = ?, max_kn = ?, passage = ?,
       raw_fixes = ?, fixes = ?, updated_at = ?
     WHERE id = ? AND status = 'live'`,
    ended,
    first?.lat ?? null,
    first?.lon ?? null,
    first ? placeLabel(first) : null,
    last?.lat ?? null,
    last?.lon ?? null,
    last ? placeLabel(last) : null,
    stats.nm,
    stats.durationMin,
    stats.underwayMin,
    stats.nightMin,
    stats.avgKn,
    stats.maxKn,
    stats.passage,
    stats.rawFixes,
    stats.fixes,
    Date.now(),
    voyageId,
  );
  const v = await getVoyage(voyageId);
  if (!v) throw new Error('voyage vanished on stop');
  return v;
}

export async function setVoyageStatus(voyageId: string, status: VoyageStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE voyages SET status = ?, updated_at = ? WHERE id = ?', status, Date.now(), voyageId);
}

export async function listVoyages(limit = 50): Promise<Voyage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM voyages WHERE status NOT IN ('discarded') ORDER BY started_at DESC LIMIT ?",
    limit,
  );
  return rows.map(toVoyage);
}

export type Totals = { nm: number; underwayMin: number; nightMin: number; voyages: number };

/** Lifetime totals over confirmed (or further) voyages. */
export async function getTotals(): Promise<Totals> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ nm: number | null; underway: number | null; night: number | null; n: number }>(
    `SELECT SUM(nm) AS nm, SUM(underway_min) AS underway, SUM(night_min) AS night, COUNT(*) AS n
     FROM voyages WHERE status IN ('confirmed', 'requested', 'signed')`,
  );
  return { nm: row?.nm ?? 0, underwayMin: row?.underway ?? 0, nightMin: row?.night ?? 0, voyages: row?.n ?? 0 };
}
