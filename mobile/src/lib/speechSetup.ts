/** Profile → Download offline speech (Android): fetches the phone's offline model so the mic works at sea. */
import { downloadOfflineModel, speechSupport } from './speech';

export async function downloadOfflineSpeech(): Promise<string> {
  if (!speechSupport().available) return 'Speech needs the full app build (not Expo Go).';
  return downloadOfflineModel();
}
