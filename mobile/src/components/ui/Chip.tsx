import { Pressable, View } from 'react-native';

import { useTokens } from '@/theme';

import { Txt } from './Txt';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Activity tick-list pill. Selected chips fill with the accent colour. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        {
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 99,
          borderWidth: 1,
          borderColor: selected ? t.colors.accent : t.colors.cardBorder,
          backgroundColor: selected ? t.colors.accent : t.colors.card,
        },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}>
      <Txt size={13} weight={selected ? 700 : 600} color={selected ? 'accentFg' : 'fg'}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Small read-only badge, as on the voyage summary: "DAY PASSAGE", "Motor yacht". */
export function Tag({ label, accent }: { label: string; accent?: boolean }) {
  const t = useTokens();
  if (accent) {
    return (
      <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.colors.accent }}>
        <Txt size={11} weight={800} upper ls={0.88} color="accentFg">
          {label}
        </Txt>
      </View>
    );
  }
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: t.colors.cardBorder,
        backgroundColor: t.colors.card,
      }}>
      <Txt size={12} weight={700}>
        {label}
      </Txt>
    </View>
  );
}
