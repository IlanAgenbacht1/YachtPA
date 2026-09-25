import { Pressable, View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Eyebrow, Hero, Icon, Row, Sheet, Txt } from '@/components/ui';
import { vessel } from '@/data/sample';
import { useAppStore } from '@/store/AppStore';
import { LOOKS, useLook, type Look } from '@/theme';

const LOOK_COPY: Record<Look, { name: string; blurb: string }> = {
  horizon: { name: 'Horizon', blurb: 'Dark navy hero, regatta orange. The default.' },
  sailcloth: { name: 'Sailcloth', blurb: 'Warm off-white, teal action, serif headlines.' },
  night: { name: 'Night watch', blurb: 'Pure black, everything in red. For the bridge after dark.' },
};

const ROWS = ['Vessels and engagements', 'Units', 'Sync and backup', 'Export my record', 'Permissions'];

export default function ProfileScreen() {
  const { look, tokens, setLook } = useLook();
  const { soon } = useAppStore();

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Profile</Eyebrow>
        <Display size={36} color="heroFg">
          {vessel.position}
        </Display>
        <Txt size={14} color="heroMuted">
          {vessel.name} · since March 2025
        </Txt>
      </Hero>

      <Sheet gap={12}>
        <FadeUp delay={50}>
          <Card gap={4} paddingV={10} paddingH={6}>
            <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 }}>
              <Eyebrow>Look</Eyebrow>
            </View>
            {LOOKS.map((l) => {
              const on = l === look;
              const sw = tokens.swatches[l];
              return (
                <Pressable
                  key={l}
                  onPress={() => setLook(l)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
                    pressed && { backgroundColor: tokens.colors.track },
                  ]}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: sw.fill,
                      borderWidth: 1,
                      borderColor: sw.border ?? tokens.colors.cardBorder,
                    }}
                  />
                  <Col gap={2} flex={1}>
                    <Txt size={15} weight={700}>
                      {LOOK_COPY[l].name}
                    </Txt>
                    <Txt size={12} color="muted">
                      {LOOK_COPY[l].blurb}
                    </Txt>
                  </Col>
                  {on && <Icon name="check" size={18} color="accent" strokeWidth={2.4} />}
                </Pressable>
              );
            })}
          </Card>
        </FadeUp>

        <FadeUp delay={120}>
          <Card gap={0} paddingV={4} paddingH={0}>
            {ROWS.map((label, i) => (
              <Pressable
                key={label}
                onPress={soon}
                accessibilityRole="button"
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: tokens.colors.cardBorder,
                  },
                  pressed && { backgroundColor: tokens.colors.track },
                ]}>
                <Txt size={15} weight={600} style={{ flex: 1 }}>
                  {label}
                </Txt>
                <Icon name="chevronRight" size={18} color="muted" />
              </Pressable>
            ))}
          </Card>
        </FadeUp>

        <FadeUp delay={190}>
          <Row gap={8} justify="center" style={{ paddingTop: 8 }}>
            <Txt size={12} weight={600} color="muted">
              YachtPA 0.1 · Deck build
            </Txt>
          </Row>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
