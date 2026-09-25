import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

import { FadeUp } from './motion';
import { Txt } from './ui';

/** Bottom toast: "Voyage saved · 35 NM added to your record". Re-animates for each new message. */
export function Toast() {
  const { toast } = useAppStore();
  const t = useTokens();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <FadeUp
      key={toast}
      style={{ position: 'absolute', left: 24, right: 24, bottom: insets.bottom + 96 }}>
      <View
        pointerEvents="none"
        style={{
          paddingVertical: 14,
          paddingHorizontal: 18,
          borderRadius: 16,
          backgroundColor: t.colors.fg,
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
        }}>
        <Txt size={14} weight={700} color="bg" align="center">
          {toast}
        </Txt>
      </View>
    </FadeUp>
  );
}
