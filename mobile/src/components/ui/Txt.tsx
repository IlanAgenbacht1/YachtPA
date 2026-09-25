import { Text, type TextProps, type TextStyle } from 'react-native';

import { fontFor, useTokens, type Tokens, type Weight } from '@/theme';

export type ColorKey = keyof Tokens['colors'];
/** A token name, or any raw colour string. */
export type ColorProp = ColorKey | (string & {});

export function useColor(color: ColorProp | undefined, fallback: ColorKey = 'fg'): string {
  const t = useTokens();
  const key = (color ?? fallback) as string;
  return (t.colors as Record<string, string>)[key] ?? key;
}

export type TxtProps = TextProps & {
  size?: number;
  weight?: Weight;
  /** Use the look's display face instead of its body face. */
  display?: boolean;
  color?: ColorProp;
  tabular?: boolean;
  upper?: boolean;
  /** Letter spacing in px (CSS em values are converted by the caller). */
  ls?: number;
  lh?: number;
  align?: TextStyle['textAlign'];
};

/** The one text primitive. Every piece of copy in the app goes through it so fonts follow the look. */
export function Txt({
  size = 14,
  weight = 400,
  display = false,
  color = 'fg',
  tabular,
  upper,
  ls,
  lh,
  align,
  style,
  ...rest
}: TxtProps) {
  const t = useTokens();
  const resolved = useColor(color);
  const s: TextStyle = {
    fontFamily: fontFor(t, display ? 'display' : 'body', weight),
    fontSize: size,
    color: resolved,
  };
  if (lh !== undefined) s.lineHeight = lh;
  if (ls !== undefined) s.letterSpacing = ls;
  if (tabular) s.fontVariant = ['tabular-nums'];
  if (upper) s.textTransform = 'uppercase';
  if (align) s.textAlign = align;
  if (display) s.includeFontPadding = false;
  return <Text {...rest} style={[s, style]} />;
}

/** Small uppercase tracked label: "MY EXPERIENCE", "TODAY · WED 24 SEP". */
export function Eyebrow({ size = 11, color = 'muted', ls, ...rest }: TxtProps) {
  return <Txt size={size} weight={800} upper ls={ls ?? size * 0.16} color={color} {...rest} />;
}

/** Display-face headline or big number. Tight line height, negative tracking. */
export function Display({ size = 36, weight = 600, ls, lh, ...rest }: TxtProps) {
  return (
    <Txt
      display
      size={size}
      weight={weight}
      lh={lh ?? Math.round(size * 1.05)}
      ls={ls ?? -size * 0.01}
      {...rest}
    />
  );
}
