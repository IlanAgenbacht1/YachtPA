/**
 * Local schema, versioned with PRAGMA user_version. Add a new entry to
 * MIGRATIONS for every change; never edit an entry that has shipped.
 *
 * Status lifecycle for voyages (docs/SCOPE.md §6):
 *   live → draft → confirmed → requested → signed, or discarded.
 */
export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS vessels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('motor', 'sail')),
    loa_m REAL,
    flag TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS engagements (
    id TEXT PRIMARY KEY,
    vessel_id TEXT NOT NULL REFERENCES vessels(id),
    position TEXT NOT NULL,
    started_on TEXT NOT NULL,
    ended_on TEXT,
    captain TEXT,
    company TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS voyages (
    id TEXT PRIMARY KEY,
    engagement_id TEXT NOT NULL REFERENCES engagements(id),
    status TEXT NOT NULL CHECK (status IN ('live', 'draft', 'confirmed', 'requested', 'signed', 'discarded')),
    source TEXT NOT NULL CHECK (source IN ('gps', 'sim', 'manual')),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    start_lat REAL, start_lon REAL, start_place TEXT,
    end_lat REAL, end_lon REAL, end_place TEXT,
    nm REAL NOT NULL DEFAULT 0,
    duration_min REAL,
    underway_min REAL,
    night_min REAL,
    avg_kn REAL,
    max_kn REAL,
    passage TEXT,
    raw_fixes INTEGER NOT NULL DEFAULT 0,
    fixes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_voyages_status ON voyages(status);
  CREATE TABLE IF NOT EXISTS track_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voyage_id TEXT NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
    ts INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy REAL,
    speed_kn REAL,
    heading REAL,
    accepted INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_track_points_voyage_ts ON track_points(voyage_id, ts);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];
