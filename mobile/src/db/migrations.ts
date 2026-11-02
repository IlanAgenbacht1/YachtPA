/**
 * SQLite schema, as an append-only list: add a new entry, never edit one that
 * has shipped. Pure strings, so tests can run them in node:sqlite.
 */

/** Synced tables and the key the outbox records for each row. */
export const SYNCED: { table: string; k1: string; k2?: string }[] = [
  { table: 'profile', k1: 'id' },
  { table: 'vessels', k1: 'id' },
  { table: 'engagements', k1: 'id' },
  { table: 'voyages', k1: 'id' },
  { table: 'track_points', k1: 'voyage_id', k2: 'ts' },
  { table: 'log_entries', k1: 'id' },
  { table: 'documents', k1: 'id' },
];

/** Record every change while backup is on and not paused (restore pauses it). */
const ON = "EXISTS (SELECT 1 FROM settings WHERE key = 'sync_on') AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'sync_paused')";

function outboxTriggers(): string {
  return SYNCED.map(({ table, k1, k2 }) => {
    const key = (row: string) => `${row}.${k1}, ${k2 ? `${row}.${k2}` : 'NULL'}`;
    return `
  CREATE TRIGGER ${table}_ai AFTER INSERT ON ${table} WHEN ${ON}
    BEGIN INSERT INTO outbox (tbl, k1, k2, op) VALUES ('${table}', ${key('NEW')}, 'upsert'); END;
  CREATE TRIGGER ${table}_au AFTER UPDATE ON ${table} WHEN ${ON}
    BEGIN INSERT INTO outbox (tbl, k1, k2, op) VALUES ('${table}', ${key('NEW')}, 'upsert'); END;
  CREATE TRIGGER ${table}_ad AFTER DELETE ON ${table} WHEN ${ON}
    BEGIN INSERT INTO outbox (tbl, k1, k2, op) VALUES ('${table}', ${key('OLD')}, 'delete'); END;`;
  }).join('');
}

export const MIGRATIONS: string[] = [
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
  // 4: outbox for cloud backup (M6). Triggers record which rows changed.
  `
  CREATE TABLE outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    tbl TEXT NOT NULL,
    k1 TEXT NOT NULL,
    k2 INTEGER,
    op TEXT NOT NULL CHECK (op IN ('upsert', 'delete'))
  );
  ${outboxTriggers()}
  `,
];
