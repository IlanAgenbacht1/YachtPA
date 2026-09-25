import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';

import { useTokens } from '@/theme';

export type SheetProps = {
  children: ReactNode;
  gap?: number;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  style?: ViewStyle;
};

/**
 * The light sheet that slides up over the hero: rounded top corners, a hairline
 * border, and its own scroll. Children lay out in a column with `gap`.
 */
export function Sheet({ children, gap = 12, padding = 20, paddingTop, paddingBottom, style }: SheetProps) {
  const t = useTokens();
  return (
    <View
      style={[
        {
          flex: 1,
          marginTop: -26,
          backgroundColor: t.colors.sheet,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderTopWidth: 1,
          borderColor: t.colors.cardBorder,
          overflow: 'hidden',
        },
        style,
      ]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          padding,
          paddingTop: paddingTop ?? padding,
          paddingBottom: paddingBottom ?? padding,
          gap,
        }}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}
