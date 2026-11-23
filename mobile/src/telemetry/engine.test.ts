/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import { MIGRATIONS } from '../db/migrations.ts';
import type { Db } from '../sync/engine.ts';
import { batteryPerHour, enqueue, flush, queued, type RemoteRow } from './engine.ts';

function phone(): Db {
  const raw = new DatabaseSync(':memory:');
  for (const m of MIGRATIONS) raw.exec(m);
  const plain = (r: unknown) => (r ? { ...(r as Record<string, unknown>) } : null);
  return {
    execAsync: async (sql) => void raw.exec(sql),
    runAsync: async (sql, ...p) => raw.prepare(sql).run(...p),
    getAllAsync: async <T,>(sql: string, ...p: (string | number | null)[]) => raw.prepare(sql).all(...p).map(plain) as T[],
    getFirstAsync: async <T,>(sql: string, ...p: (string | number | null)[]) => plain(raw.prepare(sql).get(...p)) as T | null,
    withTransactionAsync: async (fn) => fn(),
  };
}
const device = { installId: 'inst-1234-abcd', appVersion: '0.1.0', platform: 'ios', osVersion: '18.2', model: 'iPhone' };

describe('telemetry queue', () => {
  it('uploads in batches, oldest first, and empties the queue', async () => {
    const db = phone();
    for (let i = 0; i < 450; i++) await enqueue(db, { ts: 1000 + i, kind: 'event', name: 'voyage_stop', props: { i } });
    const batches: RemoteRow[][] = [];
    const sent = await flush(db, async (rows) => void batches.push(rows), device, 200);
    assert.equal(sent, 450);
    assert.deepEqual(batches.map((b) => b.length), [200, 200, 50]);
    assert.equal(batches[0][0].props.i, 0);
    assert.equal(batches[0][0].install_id, 'inst-1234-abcd');
    assert.equal(await queued(db), 0);
  });

  it('keeps what did not upload when the signal drops', async () => {
    const db = phone();
    for (let i = 0; i < 300; i++) await enqueue(db, { ts: i, kind: 'log', name: 'mic', level: 'warn', message: 'x' });
    let calls = 0;
    await assert.rejects(
      flush(db, async () => {
        if (++calls === 2) throw new Error('offline');
      }, device, 200),
      /offline/,
    );
    assert.equal(await queued(db), 100);
  });

  it('never grows past the cap during long offline spells', async () => {
    const db = phone();
    for (let i = 0; i < 260; i++) await enqueue(db, { ts: i, kind: 'event', name: 'e' }, 100);
    assert.ok((await queued(db)) <= 150);
  });
});

describe('batteryPerHour', () => {
  it('measures only unplugged, long enough voyages', () => {
    assert.equal(batteryPerHour({ level: 90, charging: false }, { level: 84, charging: false }, 240), 1.5);
    assert.equal(batteryPerHour({ level: 90, charging: true }, { level: 95, charging: false }, 240), null);
    assert.equal(batteryPerHour({ level: 90, charging: false }, { level: 89, charging: false }, 10), null);
  });
});
