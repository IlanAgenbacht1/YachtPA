import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';

import { fmtDur } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

import { Blink } from './motion';
import { Dot, Icon, Txt, type IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  log: { label: 'Log', icon: 'book' },
  experience: { label: 'Experience', icon: 'compass' },
  documents: { label: 'Documents', icon: 'file' },
  profile: { label: 'Profile', icon: 'user' },
};

/** Bottom tabs from the Deck build, with the live-voyage mini bar docked above them. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useTokens();
  const { live } = useAppStore();
  const focused = state.routes[state.index]?.name;
  const showMini = !!live && focused !== 'index';

  return (
    <View style={{ backgroundColor: t.colors.sheet }}>
      {showMini && live && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <Pressable
            onPress={() => router.push('/live')}
            accessibilityRole="button"
            accessibilityLabel="Open live voyage"
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: t.colors.fg,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              },
              pressed && { transform: [{ scale: 0.985 }] },
            ]}>
            <Blink>
              <Dot color="accent" size={8} />
            </Blink>
            <Txt size={13} weight={700} color="bg" tabular style={{ flex: 1 }}>
              Underway · {live.voyage.nm.toFixed(1)} NM · {fmtDur(live.elapsedMin)}
            </Txt>
            <Icon name="chevronRight" size={18} color="bg" strokeWidth={2.2} />
          </Pressable>
        </View>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          paddingTop: 10,
          paddingHorizontal: 8,
          paddingBottom: Math.max(insets.bottom, 12) + 10,
          backgroundColor: t.colors.tab,
          borderTopWidth: 1,
          borderTopColor: t.colors.cardBorder,
        }}>
        {state.routes.map((route, i) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const isFocused = state.index === i;
          const color = isFocused ? t.colors.tabActive : t.colors.tabFg;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={meta.label}
              style={{ width: 70, alignItems: 'center', gap: 4, paddingTop: 2 }}>
              <Icon name={meta.icon} size={22} color={color} />
              <Txt size={11} weight={isFocused ? 700 : 600} color={color} numberOfLines={1}>
                {meta.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
