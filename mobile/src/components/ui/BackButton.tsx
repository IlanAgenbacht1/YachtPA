import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useTokens } from '@/theme';

import { Icon, type IconName } from './Icon';

/** Square button on the hero band: back, close, minimise. */
export function HeroButton({ icon = 'chevronLeft', label = 'Back', onPress = () => router.back() }: { icon?: IconName; label?: string; onPress?: () => void }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.btn2,
          borderWidth: 1,
          borderColor: t.colors.btn2Border,
        },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}>
      <Icon name={icon} size={20} color="heroFg" />
    </Pressable>
  );
}
