import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { fontFor, useTokens } from '@/theme';

import { Eyebrow, Txt } from './Txt';

type FieldProps = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  hint?: string;
};

/** Labelled text input. Large and high-contrast: wet hands, bright sun. */
export function Field({ label, value, onChangeText, hint, multiline, style, ...rest }: FieldProps) {
  const t = useTokens();
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow size={10} ls={1.2}>
        {label}
      </Eyebrow>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={t.colors.muted}
        multiline={multiline}
        keyboardAppearance={t.look === 'night' ? 'dark' : 'light'}
        style={[
          {
            minHeight: multiline ? 120 : 52,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 0,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.cardBorder,
            backgroundColor: t.colors.card,
            color: t.colors.fg,
            fontFamily: fontFor(t, 'body', 400),
            fontSize: 16,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...rest}
      />
      {hint ? (
        <Txt size={12} color="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
}

function toIso(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`;
}

/** Date as "YYYY-MM-DD". The native compact picker on iOS; a plain field in the browser preview. */
export function DateField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const t = useTokens();
  if (Platform.OS !== 'ios') {
    return <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" hint={hint} autoCapitalize="none" />;
  }
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow size={10} ls={1.2}>
        {label}
      </Eyebrow>
      <View style={{ alignItems: 'flex-start' }}>
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="compact"
          accentColor={t.colors.accent}
          themeVariant={t.look === 'night' ? 'dark' : 'light'}
          onValueChange={(_, d) => onChange(toIso(d))}
        />
      </View>
      {hint ? (
        <Txt size={12} color="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Two-to-four way choice: Motor / Sail. */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTokens();
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow size={10} ls={1.2}>
        {label}
      </Eyebrow>
      <View style={{ flexDirection: 'row', gap: 6, padding: 4, borderRadius: t.radius.md, backgroundColor: t.colors.track }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radius.md - 4,
                backgroundColor: on ? t.colors.card : 'transparent',
                boxShadow: on ? t.shadows.card : undefined,
              }}>
              <Txt size={15} weight={on ? 800 : 600} color={on ? 'fg' : 'muted'}>
                {o.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export { toIso as isoDate };
