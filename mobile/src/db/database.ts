import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './schema';

export const DB_NAME = 'yachtpa.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** One shared connection, opened and migrated on first use. Safe to call from the background task. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

export function newId(): string {
  return Crypto.randomUUID();
}

/** Drops every row. For the testing card on the Profile screen; never called in normal use. */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM track_points;
    DELETE FROM voyages;
    DELETE FROM engagements;
    DELETE FROM vessels;
    DELETE FROM settings;
  `);
}
