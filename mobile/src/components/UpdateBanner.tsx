import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { log } from '@/lib/diag';
import { checkAndDownload, restartIntoUpdate, updatesOn } from '@/lib/updates';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

import { Icon, Txt } from './ui';

/**
 * "New version ready · Restart" once an update has downloaded, so testers
 * never need the close-and-reopen-twice routine. Hidden during a voyage.
 * Also checks for updates whenever the app comes back to the front.
 */
export function UpdateBanner() {
  if (!updatesOn) return null;
  return <Banner />;
}

function Banner() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { voyage } = useAppStore();
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = useRef(0);

  useEffect(() => {
    const check = () => {
      if (Date.now() - lastCheck.current < 5 * 60000) return;
      lastCheck.current = Date.now();
      checkAndDownload().catch((e) => log('warn', 'update', 'Update check failed', e));
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!isUpdatePending || voyage) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8 }}>
      <Pressable
        onPress={() => restartIntoUpdate().catch((e) => log('warn', 'update', 'Restart failed', e))}
        accessibilityRole="button"
        accessibilityLabel="New version ready. Restart to update."
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 16,
          backgroundColor: t.colors.fg,
          boxShadow: '0 10px 28px rgba(0,0,0,0.3)',
          opacity: pressed ? 0.9 : 1,
        })}>
        <Txt size={14} weight={700} color="bg" style={{ flex: 1 }}>
          New version ready
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.colors.accent }}>
          <Icon name="check" size={14} color="accentFg" strokeWidth={2.6} />
          <Txt size={13} weight={800} color="accentFg">
            Restart
          </Txt>
        </View>
      </Pressable>
    </View>
  );
}
