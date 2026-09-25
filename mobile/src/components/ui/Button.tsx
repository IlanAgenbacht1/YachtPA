import { Pressable, type ViewStyle } from 'react-native';

import { useTokens } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export type ButtonVariant = 'primary' | 'danger' | 'hero' | 'ghost' | 'dashed';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconStrokeWidth?: number;
  height?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * The app's buttons. `primary` and `danger` are the big uppercase actions
 * (Start, Stop, Confirm); `hero` sits on the hero band; `ghost` and `dashed`
 * are quiet actions on the sheet.
 */
export function Button({ label, onPress, variant = 'primary', icon, iconStrokeWidth, height, style, accessibilityLabel }: ButtonProps) {
  const t = useTokens();
  const c = t.colors;

  const spec = {
    primary: { bg: c.accent, fg: c.accentFg, border: c.accent, h: 66, size: 16, weight: 800, upper: true, ls: 1.28, shadow: t.shadows.button, radius: t.radius.lg, dashed: false },
    danger: { bg: c.danger, fg: c.accentFg, border: c.danger, h: 66, size: 16, weight: 800, upper: true, ls: 1.28, shadow: t.shadows.button, radius: t.radius.lg, dashed: false },
    hero: { bg: c.btn2, fg: c.btn2Fg, border: c.btn2Border, h: 58, size: 15, weight: 700, upper: true, ls: 0.9, shadow: undefined, radius: t.radius.lg, dashed: false },
    ghost: { bg: c.card, fg: c.fg, border: c.cardBorder, h: 48, size: 15, weight: 700, upper: false, ls: 0, shadow: undefined, radius: t.radius.lg, dashed: false },
    dashed: { bg: 'transparent', fg: c.muted, border: c.muted, h: 54, size: 14, weight: 700, upper: false, ls: 0, shadow: undefined, radius: t.radius.md, dashed: true },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          height: height ?? spec.h,
          borderRadius: spec.radius,
          backgroundColor: spec.bg,
          borderWidth: 1,
          borderColor: spec.border,
          borderStyle: spec.dashed ? 'dashed' : 'solid',
          boxShadow: spec.shadow,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: 18,
        },
        style,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      {icon && <Icon name={icon} size={22} color={spec.fg} strokeWidth={iconStrokeWidth ?? 2.2} />}
      <Txt size={spec.size} weight={spec.weight as 700 | 800} upper={spec.upper} ls={spec.ls} color={spec.fg}>
        {label}
      </Txt>
    </Pressable>
  );
}
