/**
 * The on-device database. The phone is the source of truth; iOS backs the
 * app's data up to iCloud with the rest of the device. Cloud sync comes later
 * and reads from here.
 *
 * Schema changes live in `migrations.ts`.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { MIGRATIONS } from './migrations';

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

/**
 * Wipes every record on this phone. Cloud backup is switched off first so
 * the wipe is not copied to the cloud; the backup stays and can be restored.
 */
export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM settings WHERE key = 'sync_on';
    DELETE FROM outbox;
    DELETE FROM track_points; DELETE FROM voyages; DELETE FROM log_entries;
    DELETE FROM documents; DELETE FROM engagements; DELETE FROM vessels; DELETE FROM profile;
  `);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
