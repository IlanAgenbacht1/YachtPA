import { Pressable, View } from 'react-native';

import { LOOKS, useLook, type Look } from '@/theme';

const LABELS: Record<Look, string> = {
  horizon: 'Horizon look',
  sailcloth: 'Sailcloth look',
  night: 'Night watch look',
};

/** Three dots in a pill: the look switch that lives in every hero. */
export function LookPill() {
  const { look, tokens, setLook } = useLook();
  return (
    <View
      accessibilityLabel="Look"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 4,
        borderRadius: 14,
        backgroundColor: tokens.colors.btn2,
        borderWidth: 1,
        borderColor: tokens.colors.btn2Border,
      }}>
      {LOOKS.map((l) => {
        const on = l === look;
        const sw = tokens.swatches[l];
        return (
          <Pressable
            key={l}
            onPress={() => setLook(l)}
            accessibilityRole="button"
            accessibilityLabel={LABELS[l]}
            accessibilityState={{ selected: on }}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: sw.fill,
                borderWidth: 1,
                borderColor: sw.border ?? 'rgba(255,255,255,0.35)',
                transform: [{ scale: on ? 1.15 : 1 }],
                boxShadow: on ? `0 0 0 2px ${tokens.colors.heroFg}` : undefined,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
