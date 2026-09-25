import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTokens } from '@/theme';

/** The gradient behind every hero. Linear top-to-bottom, plus Horizon's orange glow at the foot. */
export function HeroBackground() {
  const t = useTokens();
  const id = useId();
  const lin = `lin${id}`;
  const rad = `rad${id}`;
  const glow = t.hero.glow;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={lin} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.hero.from} />
          <Stop offset="1" stopColor={t.hero.to} />
        </LinearGradient>
        {glow && (
          <RadialGradient id={rad} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={glow.color} stopOpacity={glow.opacity} />
            <Stop offset="0.6" stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        )}
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${lin})`} />
      {glow && <Ellipse cx="50%" cy="100%" rx="45%" ry="55%" fill={`url(#${rad})`} />}
    </Svg>
  );
}

/** Faint compass rose in the top-right corner of the Home hero. */
export function CompassRose() {
  const t = useTokens();
  return (
    <Svg
      viewBox="0 0 200 200"
      width={250}
      height={250}
      fill="none"
      stroke={t.colors.heroFg}
      opacity={0.08}
      pointerEvents="none"
      style={{ position: 'absolute', right: -88, top: -76 }}>
      <Circle cx="100" cy="100" r="92" strokeWidth="1" />
      <Circle cx="100" cy="100" r="66" strokeWidth="1" strokeDasharray="2 5" />
      <Circle cx="100" cy="100" r="5" strokeWidth="1" />
      <Path d="M100 8L107 100 100 192 93 100Z" strokeWidth="1" />
      <Path d="M8 100L100 93 192 100 100 107Z" strokeWidth="1" />
      <Path d="M35 35L104 96 165 165 96 104Z" strokeWidth="1" opacity={0.7} />
      <Path d="M165 35L104 104 35 165 96 96Z" strokeWidth="1" opacity={0.7} />
    </Svg>
  );
}

export type HeroProps = {
  children: ReactNode;
  gap?: number;
  /** Extra room under the content so the sheet's 26px overlap does not cover anything. */
  paddingBottom?: number;
  compass?: boolean;
  style?: ViewStyle;
  /** Decorations rendered between the background and the content (waves, glows). */
  backdrop?: ReactNode;
};

/** Dark (or sailcloth) hero band at the top of a screen. Content sits over the gradient. */
export function Hero({ children, gap = 22, paddingBottom = 48, compass, style, backdrop }: HeroProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          position: 'relative',
          overflow: 'hidden',
          paddingTop: insets.top + 14,
          paddingHorizontal: 24,
          paddingBottom,
          gap,
        },
        style,
      ]}>
      <HeroBackground />
      {compass && <CompassRose />}
      {backdrop}
      {children}
    </View>
  );
}
