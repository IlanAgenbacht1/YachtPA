/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { MIGRATIONS } from './migrations.ts';

function fresh() {
  const db = new DatabaseSync(':memory:');
  for (const m of MIGRATIONS) db.exec(m);
  db.exec(`INSERT INTO profile (id, name, created_at) VALUES (1, 'Sam', 1);
           INSERT INTO vessels (id, name, propulsion, created_at) VALUES ('v1', 'Shadow', 'motor', 1);
           INSERT INTO vessels (id, name, propulsion, created_at) VALUES ('v2', 'Breeze', 'sail', 1);
           INSERT INTO engagements (id, vessel_id, position, start_date, created_at) VALUES ('e1', 'v2', 'Mate', '2026-01-01', 1);
           INSERT INTO voyages (id, engagement_id, started_at, source, status) VALUES ('vg', 'e1', 1, 'gps', 'live');`);
  return db;
}
const outbox = (db: DatabaseSync) => db.prepare('SELECT tbl, k1, k2, op FROM outbox ORDER BY seq').all();

describe('migrations', () => {
  it('apply cleanly in order', () => {
    assert.doesNotThrow(() => fresh());
  });

  it('record nothing while backup is off', () => {
    const db = fresh();
    db.exec("UPDATE vessels SET name = 'X'");
    assert.equal(outbox(db).length, 0);
  });

  it('record inserts, updates and deletes once backup is on', () => {
    const db = fresh();
    db.exec(`INSERT INTO settings (key, value) VALUES ('sync_on', '1');
             UPDATE vessels SET name = 'X' WHERE id = 'v1';
             INSERT INTO track_points (voyage_id, ts, lat, lon) VALUES ('vg', 42, 1, 2);
             DELETE FROM vessels WHERE id = 'v1';`);
    assert.deepEqual(
      outbox(db).map((r) => ({ ...r })),
      [
        { tbl: 'vessels', k1: 'v1', k2: null, op: 'upsert' },
        { tbl: 'track_points', k1: 'vg', k2: 42, op: 'upsert' },
        { tbl: 'vessels', k1: 'v1', k2: null, op: 'delete' },
      ],
    );
  });

  it('record nothing while paused for a restore', () => {
    const db = fresh();
    db.exec(`INSERT INTO settings (key, value) VALUES ('sync_on', '1'), ('sync_paused', '1');
             INSERT INTO documents (id, name, created_at) VALUES ('d1', 'ENG1', 1);`);
    assert.equal(outbox(db).length, 0);
  });
});
