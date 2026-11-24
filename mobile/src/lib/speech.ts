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

export type ListenOptions = {
  onDevice: boolean;
  lang?: string;
  /** Android: which recognition service to use (default when omitted) */
  service?: string;
  /** Android: ask the service to work offline if it can */
  preferOffline?: boolean;
};

const GOOGLE_APP = 'com.google.android.googlequicksearchbox';
const GOOGLE_ON_DEVICE = 'com.google.android.as';
/** "Speech Services by Google": the usual default recogniser on Android, online and offline. */
const GOOGLE_TTS = 'com.google.android.tts';

let attemptsCache: ListenOptions[] | null = null;
let diagCache: Record<string, unknown> | null = null;

/** What this phone offers for speech: services, default service, languages. Goes into the mic metrics. */
export async function speechDiagnostics(): Promise<Record<string, unknown>> {
  if (diagCache) return diagCache;
  const m = load();
  const d: Record<string, unknown> = {};
  try {
    d.phoneLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    // not available
  }
  if (!m || Platform.OS !== 'android') return (diagCache = d);
  try {
    d.services = m.getSpeechRecognitionServices().slice(0, 8);
  } catch {
    d.services = 'error';
  }
  try {
    d.defaultService = m.getDefaultRecognitionService().packageName;
  } catch {
    d.defaultService = 'error';
  }
  for (const pkg of [GOOGLE_ON_DEVICE, GOOGLE_APP]) {
    try {
      const r = await m.getSupportedLocales({ androidRecognitionServicePackage: pkg });
      const en = (l: string[]) => l.filter((x) => /^en/i.test(x)).slice(0, 6);
      d[pkg === GOOGLE_APP ? 'googleApp' : 'onDevice'] = { english: en(r.locales), installedEnglish: en(r.installedLocales), total: r.locales.length };
    } catch (e) {
      d[pkg === GOOGLE_APP ? 'googleApp' : 'onDevice'] = `error: ${(e as Error).message?.slice(0, 80)}`;
    }
  }
  return (diagCache = d);
}

/**
 * Ways to start recognition, best first.
 *
 * iPhone: on-device recognition is built in, so it is required where
 * supported (works without signal), then server recognition.
 *
 * Android: requiring on-device, or even preferring offline, fails at once
 * with "language-not-supported" when the offline English model is missing
 * (seen on a Samsung S25, Android 17). So: Google's on-device service only
 * when English is installed for offline use; otherwise Google's normal
 * online recognition (the Google app), then the phone's default service,
 * then US English. A Samsung/Bixby service is tried last.
 */
export async function recognitionAttempts(): Promise<ListenOptions[]> {
  if (attemptsCache) return attemptsCache;
  const s = speechSupport();
  const list: ListenOptions[] = [];
  if (Platform.OS === 'ios') {
    if (s.onDevice) list.push({ onDevice: true });
    list.push({ onDevice: false }, { onDevice: false, lang: 'en-US' });
    return (attemptsCache = list);
  }
  const d = await speechDiagnostics();
  const services = Array.isArray(d.services) ? (d.services as string[]) : [];
  const offlineEnglish = (d.onDevice as { installedEnglish?: string[] } | undefined)?.installedEnglish?.[0];
  // 1. Offline English already downloaded: on-device, works at sea.
  if (offlineEnglish && services.includes(GOOGLE_ON_DEVICE)) list.push({ onDevice: true, service: GOOGLE_ON_DEVICE, lang: offlineEnglish, preferOffline: true });
  // 2. Online recognition, only through services this phone actually has: the default first, Samsung last.
  //    Unknown third-party services (another app's voice service) are skipped.
  const online = [typeof d.defaultService === 'string' ? d.defaultService : '', GOOGLE_TTS, GOOGLE_APP, ...services]
    .filter((p, i, all) => p && all.indexOf(p) === i && p !== GOOGLE_ON_DEVICE && services.includes(p) && /google|samsung|bixby/i.test(p))
    .sort((x, y) => Number(/bixby|samsung/i.test(x)) - Number(/bixby|samsung/i.test(y)));
  for (const service of online) for (const lang of [undefined, 'en-US', 'en-GB']) list.push({ onDevice: false, service, lang });
  // 3. Whatever the phone picks, as a last resort.
  list.push({ onDevice: false }, { onDevice: false, lang: 'en-US' });
  return (attemptsCache = list);
}

/** Errors worth trying the next way for (the service or language is the problem, not the user). */
export const RETRYABLE = ['language-not-supported', 'service-not-allowed', 'client', 'busy', 'audio-capture'];

/** The attempt that worked last on this phone, so later taps start there. */
let working = 0;
export const firstAttempt = () => working;
export function rememberWorking(i: number) {
  working = i;
}

export type ListenHandlers = {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (code: string) => void;
  onEnd: () => void;
};

export type Session = { stop: () => void; abort: () => void };

/** Asks for permission, then listens until stopped. */
export async function listen(h: ListenHandlers, vocabulary: string[], opts: ListenOptions): Promise<Session | { error: string }> {
  const m = load();
  if (!m) return { error: 'unavailable' };
  let perm: { granted: boolean };
  try {
    perm = await m.requestPermissionsAsync();
  } catch {
    return { error: 'unknown' };
  }
  if (!perm.granted) return { error: 'not-allowed' };

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
      requiresOnDeviceRecognition: opts.onDevice,
      ...(opts.lang ? { lang: opts.lang } : {}),
      ...(opts.service ? { androidRecognitionServicePackage: opts.service } : {}),
      contextualStrings: vocabulary,
      iosTaskHint: 'dictation',
      androidIntentOptions: {
        EXTRA_PREFER_OFFLINE: !!opts.preferOffline,
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

/** Android: fetch an offline English model for the on-device service, so the mic works at sea. */
export async function downloadOfflineModel(): Promise<string> {
  const m = load();
  if (!m || Platform.OS !== 'android') return 'Not needed on this phone.';
  try {
    let locale = 'en-US';
    try {
      const r = await m.getSupportedLocales({ androidRecognitionServicePackage: GOOGLE_ON_DEVICE });
      const phone = Intl.DateTimeFormat().resolvedOptions().locale;
      locale = [phone, 'en-US', 'en-GB', 'en-AU'].find((l) => r.locales.includes(l)) ?? r.locales.find((l) => /^en/i.test(l)) ?? locale;
    } catch {
      // keep en-US
    }
    const r = await m.androidTriggerOfflineModelDownload({ locale });
    attemptsCache = null;
    diagCache = null;
    return r.status === 'download_success' ? `Offline speech (${locale}) is ready.` : r.status === 'opened_dialog' ? 'Follow the prompt to download.' : 'Download scheduled.';
  } catch {
    return 'This phone cannot download an offline speech model.';
  }
}
