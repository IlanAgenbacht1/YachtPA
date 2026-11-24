import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Bar, Blink, FadeUp } from '@/components/motion';
import { Button, Card, Col, Eyebrow, Icon, Row, Txt } from '@/components/ui';
import { applyResult, EMPTY_TRANSCRIPT, fullText, speechErrorText, YACHT_VOCABULARY, type Transcript } from '@/lib/dictation';
import { log } from '@/lib/diag';
import { track } from '@/telemetry';
import { thump } from '@/lib/haptics';
import { firstAttempt, listen, recognitionAttempts, rememberWorking, RETRYABLE, speechDiagnostics, speechSupport, type ListenOptions, type Session } from '@/lib/speech';
import { useTokens } from '@/theme';

const BAR_HEIGHTS = [18, 30, 40, 24, 36, 16, 42, 28, 20, 38, 26, 14, 32, 22];

/**
 * The big mic. Tap, speak, watch it write, tap Done. The transcript goes to
 * `onDone`; the caller turns it into the draft. Ported from the in-app mic
 * built in another session (commit cede1c8), without audio keeping.
 */
export function Dictate({ onDone, onType, compact }: { onDone: (text: string) => void; onType?: () => void; compact?: boolean }) {
  const t = useTokens();
  const support = speechSupport();
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening'>('idle');
  const [tx, setTx] = useState<Transcript>(EMPTY_TRANSCRIPT);
  const [error, setError] = useState('');
  const [needsSettings, setNeedsSettings] = useState(false);
  const session = useRef<Session | null>(null);
  const txRef = useRef<Transcript>(EMPTY_TRANSCRIPT);
  const lastError = useRef('');

  // Leaving the screen mid-sentence throws the session away.
  useEffect(() => () => session.current?.abort(), []);

  const attempts = useRef<ListenOptions[]>([]);

  const start = async () => {
    if (phase !== 'idle') return;
    thump();
    setError('');
    setNeedsSettings(false);
    setTx(EMPTY_TRANSCRIPT);
    txRef.current = EMPTY_TRANSCRIPT;
    setPhase('starting');
    attempts.current = await recognitionAttempts().catch(() => [{ onDevice: false }]);
    begin(Math.min(firstAttempt(), attempts.current.length - 1));
  };

  /** Starts attempt `i`; if the phone says the language is not supported, quietly tries the next way. */
  const begin = async (i: number) => {
    const opts = attempts.current[i];
    lastError.current = '';
    const r = await listen(
      {
        onResult: (text, isFinal) => {
          txRef.current = applyResult(txRef.current, text, isFinal);
          setTx(txRef.current);
        },
        onError: (code) => {
          lastError.current = code;
          if (code !== 'aborted' && code !== 'no-speech') log('warn', 'mic', `Speech error: ${code}`);
        },
        onEnd: () => {
          session.current = null;
          const text = fullText(txRef.current);
          const failed = !text;
          const last = failed && !(RETRYABLE.includes(lastError.current) && i + 1 < attempts.current.length);
          // Full picture of the phone's speech setup on the final failure, so it can be fixed without guessing.
          (last ? speechDiagnostics() : Promise.resolve(null)).then((diag) =>
            track('mic_result', {
              ok: !failed,
              error: failed ? lastError.current || null : null,
              words: failed ? 0 : text.split(/\s+/).length,
              onDevice: opts.onDevice,
              lang: opts.lang ?? 'phone',
              service: opts.service ?? 'default',
              attempt: i,
              of: attempts.current.length,
              ...(diag ? { diag } : {}),
            }),
          );
          if (failed && RETRYABLE.includes(lastError.current) && i + 1 < attempts.current.length) {
            begin(i + 1);
            return;
          }
          if (text) rememberWorking(i);
          setPhase('idle');
          if (text) onDone(text);
          else if (lastError.current && lastError.current !== 'aborted') setError(speechErrorText(lastError.current));
        },
      },
      YACHT_VOCABULARY,
      opts,
    );
    if ('error' in r) {
      track('mic_result', { ok: false, error: r.error, words: 0, onDevice: opts.onDevice, attempt: i });
      setPhase('idle');
      setError(speechErrorText(r.error));
      setNeedsSettings(r.error === 'not-allowed');
      return;
    }
    session.current = r;
    setPhase('listening');
  };

  const done = () => {
    thump();
    session.current?.stop();
  };

  const cancel = () => {
    session.current?.abort();
    txRef.current = EMPTY_TRANSCRIPT;
    setTx(EMPTY_TRANSCRIPT);
  };

  const listening = phase !== 'idle';

  if (compact && !listening) {
    return (
      <View style={{ gap: 6 }}>
        <Button variant="ghost" icon="mic" label="Say more" onPress={start} />
        {error ? (
          <Txt size={13} weight={600} color="danger" align="center">
            {error}
          </Txt>
        ) : null}
        {needsSettings ? (
          <Pressable onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
            <Txt size={13} weight={700} color="accent">
              Open Settings
            </Txt>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <FadeUp>
      <Col align="center" gap={18} style={{ paddingTop: 22, paddingBottom: 4 }}>
        <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
          {!listening && <View style={{ position: 'absolute', top: -30, left: -30, right: -30, bottom: -30, borderRadius: 999, backgroundColor: t.colors.accent, opacity: 0.07 }} />}
          <View style={{ position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 999, backgroundColor: t.colors.accent, opacity: 0.12 }} />
          <Pressable
            onPress={listening ? done : start}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Done speaking' : 'Start speaking'}
            style={({ pressed }) => [
              { width: 116, height: 116, borderRadius: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.accent, boxShadow: t.shadows.button },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}>
            <Icon name={listening ? 'stop' : 'mic'} size={listening ? 36 : 46} color="accentFg" strokeWidth={1.9} />
          </Pressable>
        </View>

        {listening ? (
          <>
            <Row gap={4} style={{ height: 44 }}>
              {BAR_HEIGHTS.map((h, i) => (
                <Bar key={i} height={h} color={t.colors.accent} delay={i * 70} />
              ))}
            </Row>
            <Blink>
              <Eyebrow color="accent">{phase === 'starting' ? 'Starting…' : 'Listening · tap when done'}</Eyebrow>
            </Blink>
          </>
        ) : (
          <Col align="center" gap={4}>
            <Txt size={17} weight={700}>
              Tap and say what you did today
            </Txt>
            <Txt size={13} color="muted">
              {support.onDevice ? 'It writes it up, you check it. Works without signal.' : 'It writes it up, you check it.'}
            </Txt>
          </Col>
        )}
      </Col>

      {listening && (
        <Card style={{ minHeight: 120, marginTop: 16 }}>
          <Txt size={16} lh={24}>
            {tx.committed}
            {tx.interim ? <Txt size={16} lh={24} color="muted">{`${tx.committed ? ' ' : ''}${tx.interim}`}</Txt> : null}
            {!tx.committed && !tx.interim ? <Txt size={16} color="muted">Go ahead…</Txt> : null}
          </Txt>
        </Card>
      )}

      {listening && (
        <View style={{ gap: 10, marginTop: 16 }}>
          <Button label="Done" icon="check" iconStrokeWidth={2.4} height={58} onPress={done} />
          <Pressable onPress={cancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
            <Txt size={13} weight={700} color="muted">
              Cancel
            </Txt>
          </Pressable>
        </View>
      )}

      {error ? (
        <Txt size={13} weight={600} color="danger" align="center" style={{ marginTop: 12 }}>
          {error}
        </Txt>
      ) : null}

      {needsSettings ? (
        <Pressable onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Txt size={13} weight={700} color="accent">
            Open Settings
          </Txt>
        </Pressable>
      ) : null}

      {!listening && onType && (
        <Pressable onPress={onType} accessibilityRole="button" style={{ alignSelf: 'center', padding: 10, marginTop: 4 }}>
          <Txt size={13} weight={700} color="accent">
            Type instead
          </Txt>
        </Pressable>
      )}
    </FadeUp>
  );
}
