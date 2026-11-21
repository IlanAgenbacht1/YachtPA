import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { isDayKey } from '@/domain/dates';
import { fontFor, useTokens } from '@/theme';

import { Row } from './layout';
import { Eyebrow, Txt } from './Txt';

/** Labelled form field wrapper. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow size={10} ls={1.2}>
        {label}
      </Eyebrow>
      {children}
      {error ? (
        <Txt size={12} weight={600} color="danger">
          {error}
        </Txt>
      ) : hint ? (
        <Txt size={12} color="muted">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export type InputProps = {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
  minHeight?: number;
  invalid?: boolean;
};

/** Big, high-contrast text input: wet hands, sunlight. */
export function Input({ value, onChangeText, placeholder, keyboardType, multiline, autoFocus, autoCapitalize, accessibilityLabel, minHeight, invalid }: InputProps) {
  const t = useTokens();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={t.colors.muted}
      keyboardType={keyboardType}
      multiline={multiline}
      autoFocus={autoFocus}
      autoCapitalize={autoCapitalize}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        minHeight: minHeight ?? (multiline ? 96 : 50),
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: invalid ? t.colors.danger : focus ? t.colors.accent : t.colors.cardBorder,
        backgroundColor: t.colors.card,
        color: t.colors.fg,
        fontFamily: fontFor(t, 'body', 400),
        fontSize: 16,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

/** YYYY-MM-DD text field with validation. */
export function DateInput({ value, onChange, allowEmpty, placeholder }: { value: string; onChange: (s: string) => void; allowEmpty?: boolean; placeholder?: string }) {
  const invalid = value !== '' ? !isDayKey(value) : !allowEmpty;
  return <Input value={value} onChangeText={onChange} placeholder={placeholder ?? 'YYYY-MM-DD'} keyboardType="numbers-and-punctuation" autoCapitalize="none" invalid={invalid && value !== ''} />;
}

/** Two-to-four way segmented choice. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const t = useTokens();
  return (
    <Row gap={6} style={{ padding: 4, borderRadius: 14, backgroundColor: t.colors.track }}>
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
              minHeight: 42,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? t.colors.card : 'transparent',
              boxShadow: on ? t.shadows.card : undefined,
            }}>
            <Txt size={14} weight={on ? 700 : 600} color={on ? 'fg' : 'muted'}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** On/off row. */
export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={15} weight={700}>
          {label}
        </Txt>
        {detail ? (
          <Txt size={12} color="muted">
            {detail}
          </Txt>
        ) : null}
      </View>
      <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: value ? t.colors.accent : t.colors.track, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value ? t.colors.accentFg : t.colors.card }} />
      </View>
    </Pressable>
  );
}

/** Parses "12.5" → 12.5, "" → null. */
export function num(s: string): number | null {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() === '' || !Number.isFinite(n) ? null : n;
}
