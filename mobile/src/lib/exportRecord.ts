import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { exportAll } from '@/db/repo';

import { recordHtml, type RecordInput } from './recordHtml';

/** Builds the PDF on the phone and opens the share sheet (mail, Files, WhatsApp…). */
export async function sharePdf(input: RecordInput) {
  const html = recordHtml(input);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const name = `Sea service record ${new Date(input.generatedAt).toISOString().slice(0, 10)}.pdf`;
  let out = uri;
  try {
    const dest = new File(Paths.cache, name);
    if (dest.exists) dest.delete();
    await new File(uri).move(dest);
    out = dest.uri;
  } catch {}
  await Sharing.shareAsync(out, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Sea service record' });
}

/** Everything the app holds, as JSON (SCOPE §12: users can export everything). */
export async function shareJson() {
  const data = JSON.stringify(await exportAll(), null, 2);
  const name = `yachtpa-export-${new Date().toISOString().slice(0, 10)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(data);
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'YachtPA data export' });
}
