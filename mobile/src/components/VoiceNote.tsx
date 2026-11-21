import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Blink } from '@/components/motion';
import { Icon, Row, Txt } from '@/components/ui';
import { fmtClock } from '@/lib/format';
import { useTokens } from '@/theme';

/** Moves a finished recording out of the cache so the OS cannot clear it. */
async function keep(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'voice');
    if (!dir.exists) dir.create({ intermediates: true });
    const src = new File(uri);
    const dest = new File(dir, `${Date.now()}.${src.extension.replace('.', '') || 'm4a'}`);
    await src.move(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/**
 * Records the spoken log as audio and keeps it with the entry. Transcription
 * from audio comes with the backend (cloud) or a development build
 * (on-device recogniser); until then the keyboard's own dictation fills the
 * transcript, which works offline on current iOS and Android.
 */
export function VoiceNote({ uri, onChange }: { uri: string | null; onChange: (uri: string | null) => void }) {
  const t = useTokens();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const start = async () => {
    setError('');
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is off.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSecs(0);
      setRecording(true);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setError('Recording is not available here.');
    }
  };

  const stop = async () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) onChange(await keep(recorder.uri));
    } catch {
      setError('Could not save the recording.');
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={recording ? stop : start}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop recording' : 'Record a voice note'}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 54,
            paddingHorizontal: 16,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: recording ? t.colors.danger : t.colors.cardBorder,
            backgroundColor: t.colors.card,
          },
          pressed && { transform: [{ scale: 0.985 }] },
        ]}>
        {recording ? (
          <Blink>
            <Icon name="stop" size={20} color="danger" />
          </Blink>
        ) : (
          <Icon name="mic" size={20} color="accent" />
        )}
        <Txt size={15} weight={700} style={{ flex: 1 }}>
          {recording ? `Recording · ${fmtClock(secs)}` : uri ? 'Voice note saved · record again' : 'Record a voice note'}
        </Txt>
        {uri && !recording ? <Icon name="check" size={18} color="ok" strokeWidth={2.4} /> : null}
      </Pressable>
      {error ? (
        <Txt size={12} weight={600} color="danger">
          {error}
        </Txt>
      ) : null}
      {uri && !recording ? (
        <Row>
          <Pressable onPress={() => onChange(null)} accessibilityRole="button">
            <Txt size={12} weight={700} color="muted">
              Remove voice note
            </Txt>
          </Pressable>
        </Row>
      ) : null}
    </View>
  );
}
