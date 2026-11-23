/**
 * Anonymous usage and diagnostics for the closed beta (see engine.ts).
 *
 * - On by default; Profile → Share anonymous usage data turns it off and
 *   empties the queue.
 * - A random install ID; never names, emails, positions or yacht names.
 * - Only active when the app has a Supabase project configured.
 * - Nothing here may throw into the app.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getDb } from '@/db/db';
import { getSetting, setSetting } from '@/db/repo';
import type { Db } from '@/sync/engine';
import { cloudConfigured, supabase } from '@/sync/supabase';

import { clearQueue, enqueue, flush, type Device, type Item } from './engine';

let enabled: boolean | null = null;
let device: Device | null = null;

async function isEnabled(): Promise<boolean> {
  if (!cloudConfigured) return false;
  if (enabled === null) enabled = (await getSetting('telemetry_off')) !== '1';
  return enabled;
}

export async function usageSharingOn(): Promise<boolean> {
  return (await getSetting('telemetry_off').catch(() => null)) !== '1';
}

export async function setUsageSharing(on: boolean): Promise<void> {
  enabled = on;
  await setSetting('telemetry_off', on ? '0' : '1');
  if (!on) await clearQueue((await getDb()) as unknown as Db);
}

function randomId(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${hex()}-${hex()}${hex()}${hex()}`;
}

async function getDevice(): Promise<Device> {
  if (device) return device;
  let installId = await getSetting('install_id');
  if (!installId) {
    installId = randomId();
    await setSetting('install_id', installId);
  }
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  device = {
    installId,
    appVersion: `${Constants.expoConfig?.version ?? '?'}${__DEV__ ? '-dev' : ''}`,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    osVersion: String(Platform.OS === 'android' ? (c.Release ?? Platform.Version) : (c.osVersion ?? Platform.Version)),
    model: Platform.OS === 'android' ? `${c.Brand ?? ''} ${c.Model ?? ''}`.trim() : Platform.OS === 'ios' ? (c.interfaceIdiom === 'pad' ? 'iPad' : 'iPhone') : 'web',
  };
  return device;
}

function queue(item: Item): void {
  (async () => {
    if (!(await isEnabled())) return;
    await enqueue((await getDb()) as unknown as Db, item);
  })().catch((e) => {
    if (__DEV__) console.warn('[telemetry] could not queue', e);
  });
}

/** A usage event: `track('voyage_stop', { nm: 23.4, gaps: 1 })`. Props must not hold personal data. */
export function track(name: string, props: Record<string, unknown> = {}): void {
  queue({ ts: Date.now(), kind: 'event', name, props });
}

/** Called by the diagnostic log for warnings and errors. */
export function trackLog(level: 'error' | 'warn' | 'info', area: string, message: string): void {
  queue({ ts: Date.now(), kind: 'log', name: area, level, message });
}

let flushing: Promise<void> | null = null;

/** Uploads what is queued. Quietly does nothing offline; tries again next time. */
export function flushTelemetry(): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      if (!supabase || !(await isEnabled())) return;
      const client = supabase;
      await flush((await getDb()) as unknown as Db, async (rows) => {
        const { error } = await client.from('telemetry').insert(rows);
        if (error) throw new Error(error.message);
      }, await getDevice());
    })()
      .catch((e) => {
        // Offline is the normal case at sea: keep the queue, try again later.
        if (__DEV__) console.warn('[telemetry] upload failed, will retry', String(e));
      })
      .finally(() => {
        flushing = null;
      });
  }
  return flushing;
}
