/** Profile → Download offline speech (Android): fetches the phone's offline model so the mic works at sea. */
import { downloadOfflineModel, speechSupport } from './speech';

export async function downloadOfflineSpeech(): Promise<string> {
  if (!speechSupport().available) return 'The mic isn’t available in this version of the app.';
  return downloadOfflineModel();
}
