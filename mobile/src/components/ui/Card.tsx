import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/theme';

import { useColor, type ColorProp } from './Txt';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  gap?: number;
  paddingV?: number;
  paddingH?: number;
  row?: boolean;
  borderColor?: ColorProp;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** White (or near-black) card with hairline border and soft shadow. Pressable when given onPress. */
export function Card({
  children,
  onPress,
  gap = 14,
  paddingV = 16,
  paddingH = 18,
  row,
  borderColor = 'cardBorder',
  style,
  accessibilityLabel,
}: CardProps) {
  const t = useTokens();
  const border = useColor(borderColor);
  const base: ViewStyle = {
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: border,
    borderRadius: t.radius.md,
    boxShadow: t.shadows.card,
    paddingVertical: paddingV,
    paddingHorizontal: paddingH,
    gap,
    flexDirection: row ? 'row' : 'column',
    alignItems: row ? 'center' : 'stretch',
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, style, pressed && { transform: [{ scale: 0.985 }] }]}>
      {children}
    </Pressable>
  );
}
