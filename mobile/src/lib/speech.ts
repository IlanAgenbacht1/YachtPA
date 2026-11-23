/**
 * Speech-to-text for the daily log (SCOPE §4.5: voice must work offshore).
 *
 * Uses expo-speech-recognition: Apple's SFSpeechRecognizer on iOS, Android's
 * SpeechRecognizer, and the Web Speech API in browsers. On-device recognition
 * is requested whenever the phone supports it, so it works with no signal.
 * No audio is kept: the transcript, edited and confirmed, is the record.
 *
 * Ported from the in-app mic built in another session (branch
 * claude/lucid-noether-jhcjul, commit cede1c8).
 *
 * The native module is not in Expo Go, so it is loaded only when present;
 * callers check `speechSupport().available` and fall back to typing.
 */
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import type * as SR from 'expo-speech-recognition';

type Module = typeof SR.ExpoSpeechRecognitionModule;

let mod: Module | null | undefined;

function load(): Module | null {
  if (mod !== undefined) return mod;
  mod = null;
  try {
    if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoSpeechRecognition')) return mod;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = (require('expo-speech-recognition') as typeof SR).ExpoSpeechRecognitionModule;
  } catch {
    mod = null;
  }
  return mod;
}

let cached: SpeechSupport | null = null;
let broken = false;

/** The mic failed on this phone this session (e.g. it threw while starting); stop offering it. */
export function markSpeechBroken() {
  broken = true;
  cached = { available: false, onDevice: false };
}

export type SpeechSupport = { available: boolean; onDevice: boolean };

/** Asked once per app session and remembered: native checks are not repeated on every render. */
export function speechSupport(): SpeechSupport {
  if (cached) return cached;
  const m = broken ? null : load();
  let available = false;
  let onDevice = false;
  if (m) {
    try {
      available = !!m.isRecognitionAvailable();
    } catch {
      available = false;
    }
    try {
      onDevice = available && !!m.supportsOnDeviceRecognition();
    } catch {
      onDevice = false;
    }
  }
  cached = { available, onDevice };
  return cached;
}

export type ListenHandlers = {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (code: string) => void;
  onEnd: () => void;
};

export type Session = { stop: () => void; abort: () => void };

/** Asks for permission, then listens until stopped. */
export async function listen(h: ListenHandlers, vocabulary: string[]): Promise<Session | { error: string }> {
  const m = load();
  if (!m) return { error: 'unavailable' };
  let perm: { granted: boolean };
  try {
    perm = await m.requestPermissionsAsync();
  } catch {
    return { error: 'unknown' };
  }
  if (!perm.granted) return { error: 'not-allowed' };

  const support = speechSupport();
  const subs = [
    m.addListener('result', (e) => {
      const text = e.results[0]?.transcript ?? '';
      if (text) h.onResult(text, e.isFinal);
    }),
    m.addListener('error', (e) => h.onError(e.error)),
    m.addListener('end', () => {
      subs.forEach((s) => s.remove());
      h.onEnd();
    }),
  ];

  try {
    m.start({
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      requiresOnDeviceRecognition: support.onDevice,
      contextualStrings: vocabulary,
      iosTaskHint: 'dictation',
      androidIntentOptions: {
        EXTRA_PREFER_OFFLINE: true,
        EXTRA_LANGUAGE_MODEL: 'free_form',
        // A pause to think should not end the log.
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
      },
    });
  } catch {
    subs.forEach((s) => s.remove());
    return { error: 'unknown' };
  }

  return { stop: () => m.stop(), abort: () => m.abort() };
}

/** Android: fetch the offline speech model so dictation works at sea. */
export async function downloadOfflineModel(): Promise<string> {
  const m = load();
  if (!m || Platform.OS !== 'android') return 'Not needed on this phone.';
  try {
    const r = await m.androidTriggerOfflineModelDownload({ locale: 'en-US' });
    return r.status === 'download_success' ? 'Offline speech is ready.' : r.status === 'opened_dialog' ? 'Follow the prompt to download.' : 'Download scheduled.';
  } catch {
    return 'This phone cannot download an offline speech model.';
  }
}
