/** The backup engine wired to the phone's database and the Supabase client. */
import { getDb } from '@/db/db';

import * as engine from './engine';
import type { Client, Db, Deps } from './engine';
import { supabase } from './supabase';

const deps: Deps = {
  db: () => getDb() as unknown as Promise<Db>,
  client: () => {
    if (!supabase) throw new Error('Cloud backup is not set up in this build.');
    return supabase as unknown as Client;
  },
};

let pushing: Promise<void> | null = null;

/** Uploads queued changes; concurrent calls share one run. */
export function pushChanges(): Promise<void> {
  if (!pushing) {
    pushing = engine.pushChanges(deps).finally(() => {
      pushing = null;
    });
  }
  return pushing;
}

export const isBackupOn = () => engine.isBackupOn(deps);
export const pendingCount = () => engine.pendingCount(deps);
export const startBackup = () => engine.startBackup(deps);
export const stopBackup = () => engine.stopBackup(deps);
export const lastBackupAt = () => engine.lastBackupAt(deps);
export const cloudHasData = () => engine.cloudHasData(deps);
export const phoneHasData = () => engine.phoneHasData(deps);
export const restoreFromCloud = (onProgress?: (msg: string) => void) => engine.restoreFromCloud(deps, onProgress);
export const replaceCloudWithPhone = () => engine.replaceCloudWithPhone(deps);

export async function deleteCloudAccount(): Promise<void> {
  await engine.deleteCloudAccount(deps);
  await supabase?.auth.signOut();
}
