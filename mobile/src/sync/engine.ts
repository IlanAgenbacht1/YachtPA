/**
 * Cloud backup engine: the phone is the source of truth and pushes its changes to
 * Supabase; a new phone restores from it. One user, usually one phone, so
 * there is no merging: when both sides hold data on first sign-in, the user
 * chooses which one wins.
 *
 * Changes are found through the outbox, which SQLite triggers fill while
 * `sync_on` is set (see db/migrations.ts).
 *
 * Pure: the database and the Supabase client are passed in (`Deps`), so the
 * tests run it against node:sqlite and an in-memory cloud. `backup.ts` wires
 * the real ones.
 */
import { SYNCED } from '../db/migrations.ts';

/** The slice of expo-sqlite the engine uses (node:sqlite stands in for it in tests). */
export type Db = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
};

type Result = { data?: unknown; error: { message: string } | null; count?: number | null };
type Query = PromiseLike<Result> & {
  eq(col: string, v: unknown): Query;
  in(col: string, v: unknown[]): Query;
  range(a: number, b: number): Query;
};
/** The slice of supabase-js the engine uses. */
export type Client = {
  auth: { getSession(): Promise<{ data: { session: { user: { id: string } } | null } }> };
  from(table: string): {
    upsert(rows: Record<string, unknown>[], opts: { onConflict: string }): PromiseLike<Result>;
    delete(): Query;
    select(cols: string, opts?: { count: 'exact'; head: true }): Query;
  };
  rpc(fn: string): PromiseLike<Result>;
};

export type Deps = { db: () => Promise<Db>; client: () => Client };

const BATCH = 500;

type OutboxRow = { seq: number; tbl: string; k1: string; k2: number | null; op: 'upsert' | 'delete' };

async function userId(d: Deps): Promise<string> {
  const { data } = await d.client().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in.');
  return id;
}

/** Primary key columns on the server, for upsert. */
const conflict = (table: string) => (table === 'profile' ? 'user_id' : table === 'track_points' ? 'user_id,voyage_id,ts' : 'user_id,id');

export async function isBackupOn(d: Deps): Promise<boolean> {
  const db = await d.db();
  return !!(await db.getFirstAsync("SELECT 1 FROM settings WHERE key = 'sync_on'"));
}

export async function pendingCount(d: Deps): Promise<number> {
  const db = await d.db();
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox'))?.n ?? 0;
}

/** Turns backup on and queues every existing row, so the first push uploads everything. */
export async function startBackup(d: Deps): Promise<void> {
  const db = await d.db();
  await db.execAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_on', '1'); DELETE FROM outbox;");
  for (const { table, k1, k2 } of SYNCED) {
    await db.execAsync(`INSERT INTO outbox (tbl, k1, k2, op) SELECT '${table}', ${k1}, ${k2 ?? 'NULL'}, 'upsert' FROM ${table}`);
  }
}

/** Turns backup off on this phone (sign out). Nothing in the cloud is touched. */
export async function stopBackup(d: Deps): Promise<void> {
  const db = await d.db();
  await db.execAsync("DELETE FROM settings WHERE key IN ('sync_on', 'sync_paused', 'last_backup'); DELETE FROM outbox;");
}

/** Uploads queued changes. Throws on network or auth errors; the queue is kept and retried next time. */
export async function pushChanges(d: Deps): Promise<void> {
  const db = await d.db();
  if (!(await isBackupOn(d))) return;
  const uid = await userId(d);
  for (;;) {
    const ops = await db.getAllAsync<OutboxRow>('SELECT * FROM outbox ORDER BY seq LIMIT 2000');
    if (ops.length === 0) break;
    const maxSeq = ops[ops.length - 1].seq;
    // Latest op per row wins.
    const latest = new Map<string, OutboxRow>();
    for (const o of ops) latest.set(`${o.tbl}|${o.k1}|${o.k2 ?? ''}`, o);

    for (const { table, k1, k2 } of SYNCED) {
      const mine = [...latest.values()].filter((o) => o.tbl === table);
      const ups = mine.filter((o) => o.op === 'upsert');
      const dels = mine.filter((o) => o.op === 'delete');

      for (let i = 0; i < ups.length; i += BATCH) {
        const chunk = ups.slice(i, i + BATCH);
        const where = k2
          ? chunk.map(() => `(${k1} = ? AND ${k2} = ?)`).join(' OR ')
          : `${k1} IN (${chunk.map(() => '?').join(',')})`;
        const params = k2 ? chunk.flatMap((o) => [o.k1, o.k2 as number]) : chunk.map((o) => o.k1);
        const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE ${where}`, ...params);
        if (rows.length === 0) continue;
        const { error } = await d
          .client()
          .from(table)
          .upsert(rows.map((r) => ({ ...r, user_id: uid })), { onConflict: conflict(table) });
        if (error) throw new Error(error.message);
      }

      if (dels.length) {
        // Track points are only ever deleted with their voyage, so delete by voyage.
        const ids = [...new Set(dels.map((o) => o.k1))];
        for (let i = 0; i < ids.length; i += BATCH) {
          const q = d.client().from(table).delete().eq('user_id', uid);
          const { error } = table === 'profile' ? await q : await q.in(k1, ids.slice(i, i + BATCH));
          if (error) throw new Error(error.message);
        }
      }
    }
    await db.runAsync('DELETE FROM outbox WHERE seq <= ?', maxSeq);
  }
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup', ?)", String(Date.now()));
}

export async function lastBackupAt(d: Deps): Promise<number | null> {
  const db = await d.db();
  const r = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_backup'");
  return r ? Number(r.value) : null;
}

/** Whether the signed-in user already has a backup in the cloud. */
export async function cloudHasData(d: Deps): Promise<boolean> {
  const { count, error } = await d
    .client().from('profile').select('user_id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/** Whether this phone has a record (has been through onboarding). */
export async function phoneHasData(d: Deps): Promise<boolean> {
  const db = await d.db();
  return !!(await db.getFirstAsync('SELECT 1 FROM profile'));
}

/** Replaces everything on this phone with the cloud backup, then turns backup on. */
export async function restoreFromCloud(d: Deps, onProgress?: (msg: string) => void): Promise<void> {
  const db = await d.db();
  const pulled: Record<string, Record<string, unknown>[]> = {};
  // Download first, so a dropped connection leaves the phone untouched.
  for (const { table } of SYNCED) {
    onProgress?.(`Downloading ${table.replace('_', ' ')}…`);
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await d.client().from(table).select('*').range(from, from + 999);
      if (error) throw new Error(error.message);
      const page = (data ?? []) as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
    pulled[table] = rows;
  }
  onProgress?.('Saving on this phone…');
  await db.execAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_paused', '1')");
  try {
    await db.withTransactionAsync(async () => {
      for (const { table } of [...SYNCED].reverse()) await db.execAsync(`DELETE FROM ${table}`);
      // SYNCED is in foreign-key order: vessels before engagements before voyages before points.
      for (const { table } of SYNCED) {
        for (const r of pulled[table]) {
          const { user_id: _drop, ...row } = r;
          void _drop;
          const cols = Object.keys(row);
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            ...cols.map((c) => row[c] as string | number | null),
          );
        }
      }
    });
  } finally {
    await db.execAsync("DELETE FROM settings WHERE key = 'sync_paused'; DELETE FROM outbox; INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_on', '1')");
  }
}

/** Deletes every row of this user in the cloud, then queues this phone's data for upload. */
export async function replaceCloudWithPhone(d: Deps): Promise<void> {
  const uid = await userId(d);
  for (const { table } of SYNCED) {
    const { error } = await d.client().from(table).delete().eq('user_id', uid);
    if (error) throw new Error(error.message);
  }
  await startBackup(d);
  await pushChanges(d);
}

/** Deletes the cloud account and all its data. The phone keeps its records. */
/** Deletes the cloud account and all its data, and stops backup. Signing out is the caller's job. */
export async function deleteCloudAccount(d: Deps): Promise<void> {
  const { error } = await d.client().rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await stopBackup(d);
}
