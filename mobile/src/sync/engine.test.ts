/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { MIGRATIONS } from '../db/migrations.ts';
import * as engine from './engine.ts';
import type { Client, Db, Deps } from './engine.ts';

type Row = Record<string, unknown>;

/** expo-sqlite's async API over node:sqlite. */
function phone(): { raw: DatabaseSync; db: Db } {
  const raw = new DatabaseSync(':memory:');
  for (const m of MIGRATIONS) raw.exec(m);
  const plain = (r: unknown) => (r ? { ...(r as Row) } : null);
  const db: Db = {
    execAsync: async (sql) => void raw.exec(sql),
    runAsync: async (sql, ...p) => raw.prepare(sql).run(...p),
    getAllAsync: async <T,>(sql: string, ...p: (string | number | null)[]) => raw.prepare(sql).all(...p).map(plain) as T[],
    getFirstAsync: async <T,>(sql: string, ...p: (string | number | null)[]) => plain(raw.prepare(sql).get(...p)) as T | null,
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { raw, db };
}

/** Supabase stand-in: tables of rows, row-level security by user_id, PostgREST-like upsert/delete/range. */
class Cloud {
  tables = new Map<string, Row[]>();
  uid = 'u1';
  fail = false;
  calls = 0;
  rows(t: string) {
    if (!this.tables.has(t)) this.tables.set(t, []);
    return this.tables.get(t)!;
  }
  mine(t: string) {
    return this.rows(t).filter((r) => r.user_id === this.uid);
  }
  client(): Client {
    const cloud = this;
    const err = () => (cloud.fail ? { message: 'network down' } : null);
    const query = (table: string, kind: 'delete' | 'select', head = false) => {
      const filters: ((r: Row) => boolean)[] = [(r) => r.user_id === cloud.uid];
      let range: [number, number] | null = null;
      const q = {
        eq(c: string, v: unknown) {
          filters.push((r) => r[c] === v);
          return q;
        },
        in(c: string, vs: unknown[]) {
          filters.push((r) => vs.includes(r[c]));
          return q;
        },
        range(a: number, b: number) {
          range = [a, b];
          return q;
        },
        then(res: (r: { data?: unknown; error: { message: string } | null; count?: number }) => unknown) {
          cloud.calls++;
          if (cloud.fail) return Promise.resolve(res({ error: err() }));
          const match = (r: Row) => filters.every((f) => f(r));
          if (kind === 'delete') {
            cloud.tables.set(table, cloud.rows(table).filter((r) => !match(r)));
            return Promise.resolve(res({ error: null }));
          }
          const all = cloud.rows(table).filter(match);
          if (head) return Promise.resolve(res({ error: null, count: all.length }));
          return Promise.resolve(res({ error: null, data: range ? all.slice(range[0], range[1] + 1) : all }));
        },
      };
      return q;
    };
    return {
      auth: { getSession: async () => ({ data: { session: { user: { id: cloud.uid } } } }) },
      from: (table: string) => ({
        upsert(rows: Row[], { onConflict }: { onConflict: string }) {
          cloud.calls++;
          if (cloud.fail) return Promise.resolve({ error: err() });
          const keys = onConflict.split(',');
          for (const row of rows) {
            if (row.user_id !== cloud.uid) return Promise.resolve({ error: { message: 'row-level security' } });
            const list = cloud.rows(table);
            const i = list.findIndex((r) => keys.every((k) => r[k] === row[k]));
            if (i >= 0) list[i] = { ...row };
            else list.push({ ...row });
          }
          return Promise.resolve({ error: null });
        },
        delete: () => query(table, 'delete'),
        select: (_cols: string, opts?: { head: true }) => query(table, 'select', !!opts?.head),
      }),
      rpc: async () => {
        for (const t of cloud.tables.keys()) cloud.tables.set(t, cloud.rows(t).filter((r) => r.user_id !== cloud.uid));
        return { error: null };
      },
    } as unknown as Client;
  }
}

function seed(raw: DatabaseSync, points = 3) {
  raw.exec(`INSERT INTO profile (id, name, created_at) VALUES (1, 'Sam', 1);
    INSERT INTO vessels (id, name, propulsion, created_at) VALUES ('v1', 'Shadow', 'motor', 1);
    INSERT INTO engagements (id, vessel_id, position, start_date, created_at) VALUES ('e1', 'v1', 'Deckhand', '2026-01-01', 1);
    INSERT INTO voyages (id, engagement_id, started_at, distance_nm, source, status) VALUES ('vg1', 'e1', 1000, 12.5, 'gps', 'confirmed');
    INSERT INTO documents (id, name, expires, created_at) VALUES ('d1', 'ENG1', '2027-05-01', 1);
    INSERT INTO log_entries (id, engagement_id, date, status, updated_at) VALUES ('l1', 'e1', '2026-10-01', 'confirmed', 1);`);
  const ins = raw.prepare('INSERT INTO track_points (voyage_id, ts, lat, lon, accuracy) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < points; i++) ins.run('vg1', 1000 + i * 1000, -20 + i / 1000, 57, 8);
}

let cloud: Cloud;
let a: ReturnType<typeof phone>;
let deps: Deps;

beforeEach(() => {
  cloud = new Cloud();
  a = phone();
  deps = { db: async () => a.db, client: () => cloud.client() };
});

describe('backup engine', () => {
  it('first backup uploads every row, tagged with the user', async () => {
    seed(a.raw, 1200);
    await engine.startBackup(deps);
    await engine.pushChanges(deps);
    assert.equal(cloud.mine('track_points').length, 1200);
    assert.equal(cloud.mine('voyages')[0].distance_nm, 12.5);
    assert.equal(cloud.mine('profile').length, 1);
    assert.ok(cloud.mine('vessels').every((r) => r.user_id === 'u1'));
    assert.equal(await engine.pendingCount(deps), 0);
    assert.ok((await engine.lastBackupAt(deps))! > 0);
  });

  it('later changes upload incrementally; deleting a voyage removes it and its track', async () => {
    seed(a.raw);
    await engine.startBackup(deps);
    await engine.pushChanges(deps);
    a.raw.exec(`UPDATE vessels SET name = 'Shadow II' WHERE id = 'v1';
      INSERT INTO documents (id, name, created_at) VALUES ('d2', 'VHF SRC', 2);
      DELETE FROM track_points WHERE voyage_id = 'vg1'; DELETE FROM voyages WHERE id = 'vg1';`);
    assert.ok((await engine.pendingCount(deps)) > 0);
    await engine.pushChanges(deps);
    assert.equal(cloud.mine('vessels')[0].name, 'Shadow II');
    assert.equal(cloud.mine('documents').length, 2);
    assert.equal(cloud.mine('voyages').length, 0);
    assert.equal(cloud.mine('track_points').length, 0);
  });

  it('a failed upload keeps the queue for next time', async () => {
    seed(a.raw);
    await engine.startBackup(deps);
    cloud.fail = true;
    await assert.rejects(engine.pushChanges(deps), /network down/);
    const pending = await engine.pendingCount(deps);
    assert.ok(pending > 0);
    cloud.fail = false;
    await engine.pushChanges(deps);
    assert.equal(await engine.pendingCount(deps), 0);
    assert.equal(cloud.mine('vessels').length, 1);
  });

  it('restores onto a new phone, then keeps backing up from there', async () => {
    seed(a.raw, 1500);
    await engine.startBackup(deps);
    await engine.pushChanges(deps);

    const b = phone();
    const depsB: Deps = { db: async () => b.db, client: () => cloud.client() };
    assert.equal(await engine.phoneHasData(depsB), false);
    assert.equal(await engine.cloudHasData(depsB), true);
    await engine.restoreFromCloud(depsB);
    const count = (t: string) => (b.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    assert.equal(count('track_points'), 1500);
    assert.equal(count('voyages'), 1);
    assert.equal((b.raw.prepare('SELECT name FROM profile').get() as { name: string }).name, 'Sam');
    assert.equal(await engine.pendingCount(depsB), 0, 'restore itself is not re-uploaded');
    assert.equal(await engine.isBackupOn(depsB), true);
    b.raw.exec(`INSERT INTO documents (id, name, created_at) VALUES ('d9', 'Passport', 3)`);
    await engine.pushChanges(depsB);
    assert.equal(cloud.mine('documents').length, 2);
  });

  it('"use this phone" replaces what was in the cloud', async () => {
    seed(a.raw);
    await engine.startBackup(deps);
    await engine.pushChanges(deps);
    const b = phone();
    b.raw.exec(`INSERT INTO profile (id, name, created_at) VALUES (1, 'Other', 1)`);
    await engine.replaceCloudWithPhone({ db: async () => b.db, client: () => cloud.client() });
    assert.equal(cloud.mine('vessels').length, 0);
    assert.equal(cloud.mine('profile')[0].name, 'Other');
  });

  it('never touches another user, and delete account removes only mine', async () => {
    seed(a.raw);
    await engine.startBackup(deps);
    await engine.pushChanges(deps);
    cloud.uid = 'u2';
    const b = phone();
    seed(b.raw);
    const depsB: Deps = { db: async () => b.db, client: () => cloud.client() };
    await engine.startBackup(depsB);
    await engine.pushChanges(depsB);
    await engine.deleteCloudAccount(depsB);
    assert.equal(cloud.mine('vessels').length, 0);
    cloud.uid = 'u1';
    assert.equal(cloud.mine('vessels').length, 1);
    assert.equal(await engine.isBackupOn(depsB), false);
  });

  it('nothing is queued while backup is off', async () => {
    seed(a.raw);
    assert.equal(await engine.pendingCount(deps), 0);
    await engine.pushChanges(deps);
    assert.equal(cloud.calls, 0);
  });
});
