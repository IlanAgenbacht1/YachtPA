/**
 * Everything on the phone as one JSON file, handed to the iOS share sheet
 * (Mail, Files, WhatsApp, AirDrop). The safety net while the app is in beta
 * and there is no cloud backup yet. The PDF record comes in M5.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db/db';
import { localDate } from '@/db/repo';

const TABLES = ['profile', 'vessels', 'engagements', 'voyages', 'track_points', 'log_entries', 'documents'] as const;

export async function exportAll(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  const db = await getDb();
  const out: Record<string, unknown> = { app: 'YachtPA', format: 1, exportedAt: new Date().toISOString() };
  for (const t of TABLES) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  const file = new File(Paths.cache, `yachtpa-${localDate()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(out));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export YachtPA data' });
}
