/**
 * Local SQLite store. The single source of truth on the phone: everything is
 * written here first and works with no signal. Cloud sync (SCOPE §5,
 * PowerSync ↔ Supabase) will replicate these tables once the backend is chosen.
 *
 * One database handle, opened synchronously so the background location task
 * (which can run with no UI) uses the same connection code as the app.
 */
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'yachtpa.db';

let handle: SQLiteDatabase | null = null;
let opening: Promise<void> | null = null;

/**
 * Opens and migrates the database without blocking. The app awaits this before
 * first render: on web the SQLite worker needs a moment to start, and a
 * synchronous call before then times out.
 */
export function initDb(): Promise<void> {
  if (handle) return Promise.resolve();
  opening ??= (async () => {
    const d = await openDatabaseAsync(DB_NAME);
    await d.execAsync('PRAGMA journal_mode = WAL');
    const row = await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let v = row?.user_version ?? 0;
    while (v < MIGRATIONS.length) {
      const sql = MIGRATIONS[v];
      const next = v + 1;
      await d.withTransactionAsync(async () => {
        await d.execAsync(sql);
        await d.execAsync(`PRAGMA user_version = ${next}`);
      });
      v = next;
    }
    handle = d;
  })();
  return opening;
}

/** The open database. Opens synchronously if needed (the background location task on native). */
export function db(): SQLiteDatabase {
  if (!handle) {
    handle = openDatabaseSync(DB_NAME);
    migrate(handle);
  }
  return handle;
}

const MIGRATIONS: string[] = [
  // 1 — domain model v0 (SCOPE §6)
  `
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '', nationality TEXT NOT NULL DEFAULT '', home_country TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', onboarded_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS vessel (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
    propulsion TEXT NOT NULL CHECK (propulsion IN ('motor','sail')), loa_m REAL, gt REAL,
    flag TEXT NOT NULL DEFAULT '', imo TEXT NOT NULL DEFAULT '', official_number TEXT NOT NULL DEFAULT '',
    home_port TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS engagement (
    id TEXT PRIMARY KEY NOT NULL, vessel_id TEXT NOT NULL REFERENCES vessel(id), position TEXT NOT NULL,
    start_date TEXT NOT NULL, end_date TEXT, captain TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS voyage (
    id TEXT PRIMARY KEY NOT NULL, engagement_id TEXT NOT NULL REFERENCES engagement(id),
    started_at INTEGER NOT NULL, ended_at INTEGER,
    start_lat REAL, start_lon REAL, end_lat REAL, end_lon REAL,
    start_place TEXT NOT NULL DEFAULT '', end_place TEXT NOT NULL DEFAULT '',
    distance_nm REAL NOT NULL DEFAULT 0, direct_nm REAL NOT NULL DEFAULT 0, duration_min REAL NOT NULL DEFAULT 0,
    underway_min REAL NOT NULL DEFAULT 0, night_min REAL NOT NULL DEFAULT 0, avg_kn REAL NOT NULL DEFAULT 0,
    max_kn REAL NOT NULL DEFAULT 0, passage_type TEXT NOT NULL DEFAULT 'day', as_skipper INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'gps', status TEXT NOT NULL DEFAULT 'draft', flags TEXT NOT NULL DEFAULT '[]',
    segments TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS voyage_engagement ON voyage(engagement_id, started_at);
  CREATE TABLE IF NOT EXISTS track_point (
    voyage_id TEXT NOT NULL, ts INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, accuracy REAL, speed REAL,
    PRIMARY KEY (voyage_id, ts)
  );
  CREATE TABLE IF NOT EXISTS log_entry (
    id TEXT PRIMARY KEY NOT NULL, engagement_id TEXT NOT NULL REFERENCES engagement(id), date TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '', activities TEXT NOT NULL DEFAULT '[]', duties TEXT NOT NULL DEFAULT '[]',
    watches TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', voice_uri TEXT, transcript TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', updated_at INTEGER NOT NULL,
    UNIQUE (engagement_id, date)
  );
  CREATE TABLE IF NOT EXISTS document (
    id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, issuer TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '', issue_date TEXT, expiry_date TEXT, file_uri TEXT, file_mime TEXT,
    superseded_by TEXT, created_at INTEGER NOT NULL
  );
  INSERT OR IGNORE INTO profile (id) VALUES (1);
  `,
];

function migrate(d: SQLiteDatabase) {
  d.execSync('PRAGMA journal_mode = WAL');
  const row = d.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  while (v < MIGRATIONS.length) {
    d.withTransactionSync(() => {
      d.execSync(MIGRATIONS[v]);
      d.execSync(`PRAGMA user_version = ${v + 1}`);
    });
    v++;
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
