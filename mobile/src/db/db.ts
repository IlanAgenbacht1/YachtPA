/**
 * The on-device database. The phone is the source of truth; iOS backs the
 * app's data up to iCloud with the rest of the device. Cloud sync comes later
 * and reads from here.
 *
 * Migrations are append-only: add a new entry to MIGRATIONS, never edit one
 * that has shipped.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    nationality TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE vessels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    propulsion TEXT NOT NULL CHECK (propulsion IN ('motor', 'sail')),
    loa_m REAL,
    gt REAL,
    flag TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE engagements (
    id TEXT PRIMARY KEY,
    vessel_id TEXT NOT NULL REFERENCES vessels(id),
    position TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    captain TEXT,
    company TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE voyages (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL REFERENCES engagements(id),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    from_name TEXT,
    to_name TEXT,
    start_lat REAL, start_lon REAL, end_lat REAL, end_lon REAL,
    distance_nm REAL NOT NULL DEFAULT 0,
    duration_min REAL NOT NULL DEFAULT 0,
    underway_min REAL NOT NULL DEFAULT 0,
    night_min REAL NOT NULL DEFAULT 0,
    avg_kn REAL NOT NULL DEFAULT 0,
    max_kn REAL NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK (source IN ('gps', 'sim', 'manual')),
    status TEXT NOT NULL CHECK (status IN ('live', 'draft', 'confirmed', 'requested', 'signed'))
  );
  CREATE INDEX voyages_started ON voyages(started_at);
  CREATE TABLE track_points (
    voyage_id TEXT NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy REAL
  );
  CREATE INDEX track_points_voyage ON track_points(voyage_id, ts);
  CREATE TABLE log_entries (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL REFERENCES engagements(id),
    date TEXT NOT NULL,
    activities TEXT NOT NULL DEFAULT '[]',
    duties TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('draft', 'confirmed', 'requested', 'signed')),
    updated_at INTEGER NOT NULL,
    UNIQUE (engagement_id, date)
  );
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issuer TEXT,
    number TEXT,
    expires TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 2: overnight passages (SCOPE §9).
  `
  ALTER TABLE voyages ADD COLUMN overnight INTEGER NOT NULL DEFAULT 0;
  `,
  // 3: skipper flag and underway minutes per day, for qualification rules.
  `
  ALTER TABLE voyages ADD COLUMN skipper INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE voyages ADD COLUMN underway_by_day TEXT NOT NULL DEFAULT '{}';
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('yachtpa.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await inTransaction(db, (txn) => txn.execAsync(sql));
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  return db;
}

/**
 * Runs `fn` in a transaction. Exclusive on iOS so nothing interleaves; the
 * browser preview only has the plain kind.
 */
async function inTransaction(db: SQLite.SQLiteDatabase, fn: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return db.withTransactionAsync(() => fn(db));
  return db.withExclusiveTransactionAsync((txn) => fn(txn));
}

export async function transaction(fn: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  return inTransaction(await getDb(), fn);
}

/** Wipes everything. Settings → Delete all data. */
export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM track_points; DELETE FROM voyages; DELETE FROM log_entries;
    DELETE FROM documents; DELETE FROM engagements; DELETE FROM vessels; DELETE FROM profile;
  `);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
