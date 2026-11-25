/**
 * Over-the-air updates (EAS Update): which version is running, checking for
 * a new one, and restarting into it. Updates download in the background; the
 * banner (components/UpdateBanner) offers the restart.
 */
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/** Real builds only: development and the browser preview cannot update over the air. */
export const updatesOn = Platform.OS !== 'web' && Updates.isEnabled;

/** "Built-in" or "Update 24 Nov 12:05" — what testers and the metrics see. */
export function versionInfo(): { label: string; updateId: string | null; embedded: boolean; channel: string | null } {
  if (!updatesOn) return { label: 'Updates off (development)', updateId: null, embedded: true, channel: null };
  const embedded = Updates.isEmbeddedLaunch;
  const when = Updates.createdAt;
  const label = embedded || !when ? 'Built-in version' : `Update of ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  return { label, updateId: Updates.updateId, embedded, channel: Updates.channel };
}

/** Looks for a newer update and downloads it. The restart is up to the user. */
export async function checkAndDownload(): Promise<'downloaded' | 'latest' | 'off'> {
  if (!updatesOn) return 'off';
  const r = await Updates.checkForUpdateAsync();
  if (!r.isAvailable) return 'latest';
  await Updates.fetchUpdateAsync();
  return 'downloaded';
}

export function restartIntoUpdate(): Promise<void> {
  return Updates.reloadAsync();
}

/**
 * Warnings and errors from the update system itself (a download that failed, an update rolled back),
 * passed to the diagnostic log once each, so a phone that never updates shows why.
 */
export async function reportUpdateProblems(log: (level: 'warn' | 'error', area: string, message: string) => void, seenUntil: number): Promise<number> {
  if (!updatesOn) return seenUntil;
  const entries = await Updates.readLogEntriesAsync(7 * 86400000);
  let latest = seenUntil;
  for (const e of entries) {
    if (e.timestamp <= seenUntil) continue;
    latest = Math.max(latest, e.timestamp);
    const level = e.level === 'error' || e.level === 'fatal' ? 'error' : e.level === 'warn' ? 'warn' : null;
    if (level) log(level, 'update', `${e.code}: ${e.message}`.slice(0, 500));
  }
  return latest;
}
