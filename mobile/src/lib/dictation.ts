/**
 * Pure transcript bookkeeping for speech recognition results, kept apart from
 * the native module so it can be unit tested.
 *
 * Recognisers report a running "interim" guess for the phrase being spoken
 * and then a final version of it. iOS keeps one growing phrase for the whole
 * session; Android in continuous mode finalises phrase by phrase. Committing
 * finals and showing the latest interim after them handles both.
 */
export type Transcript = { committed: string; interim: string };

export const EMPTY_TRANSCRIPT: Transcript = { committed: '', interim: '' };

const join = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' ');

export function applyResult(t: Transcript, text: string, isFinal: boolean): Transcript {
  if (isFinal) return { committed: join(t.committed, text), interim: '' };
  return { committed: t.committed, interim: text };
}

/** What to show and what to keep: committed text plus anything still interim when listening stopped. */
export function fullText(t: Transcript): string {
  return join(t.committed, t.interim);
}

/** Words the recogniser should expect (PRD §6). Improves "chamois", "passerelle", "seabob"… */
export const YACHT_VOCABULARY = [
  'bosun', 'deckhand', 'lead deckhand', 'mate', 'chief officer', 'stew', 'stewardess', 'engineer',
  'tender', 'RIB', 'chase boat', 'toys', 'jet ski', 'seabob', 'paddleboard', 'wakeboard',
  'washdown', 'chamois', 'teak', 'stainless', 'varnish', 'gelcoat', 'fenders', 'dock lines', 'mooring lines',
  'med-moor', 'stern-to', 'anchoring', 'anchor watch', 'night watch', 'watchkeeping', 'passage', 'passage plan',
  'windlass', 'capstan', 'davit', 'crane', 'passerelle', 'gangway', 'lazarette', 'bimini', 'flybridge', 'sundeck',
  'bilge', 'generator', 'fuel filters', 'watermaker', 'safety drill', 'fire drill', 'man overboard', 'life raft',
  'turndown', 'guest operations', 'provisioning', 'bunkering',
];

/** Plain-language reason for a recogniser error code. */
export function speechErrorText(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone or speech permission is off. Turn it on in Settings.';
    case 'network':
    case 'language-not-supported':
      return 'No signal and no offline speech model on this phone. Your voice note is saved; type what you did, or try again later.';
    case 'no-speech':
    case 'speech-timeout':
      return "Didn't catch anything. Tap the mic and try again.";
    case 'audio-capture':
      return 'The microphone is busy or unavailable.';
    case 'busy':
      return 'Speech recognition is busy. Try again in a moment.';
    default:
      return 'Speech recognition stopped. Try again, or type it.';
  }
}
