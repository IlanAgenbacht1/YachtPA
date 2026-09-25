import { View } from 'react-native';

import { useTokens } from '@/theme';

import { Eyebrow, Txt } from './Txt';

export type TileProps = {
  label: string;
  value: string;
  /** `hero` tiles sit on the hero band (translucent); `card` tiles sit on the sheet. */
  on?: 'hero' | 'card';
  valueSize?: number;
};

/** Labelled number: ELAPSED 1h 04m, AVG SPEED 9.8 kn. */
export function Tile({ label, value, on = 'card', valueSize }: TileProps) {
  const t = useTokens();
  const hero = on === 'hero';
  return (
    <View
      style={{
        gap: 4,
        paddingVertical: hero ? 12 : 14,
        paddingHorizontal: hero ? 14 : 16,
        borderRadius: t.radius.md,
        backgroundColor: hero ? t.colors.btn2 : t.colors.card,
        borderWidth: 1,
        borderColor: hero ? t.colors.btn2Border : t.colors.cardBorder,
        boxShadow: hero ? undefined : t.shadows.card,
      }}>
      <Eyebrow size={10} ls={1.2} color={hero ? 'heroMuted' : 'muted'}>
        {label}
      </Eyebrow>
      <Txt size={valueSize ?? (hero ? 18 : 20)} weight={800} tabular color={hero ? 'heroFg' : 'fg'}>
        {value}
      </Txt>
    </View>
  );
}
