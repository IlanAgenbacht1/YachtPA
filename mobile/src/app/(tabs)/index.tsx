import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { FadeUp, Blink } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Ring, Row, Sheet, Txt } from '@/components/ui';
import { docCounts, experience, qualification, vessel } from '@/data/sample';
import { fmtDateShort, fmtDur, fmtInt } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore, type LiveVoyage } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function HomeScreen() {
  const t = useTokens();
  const { voyage, loggedToday, startVoyage, totals } = useAppStore();

  const onStart = () => {
    thump();
    startVoyage();
    router.push('/live');
  };

  return (
    <Screen>
      <Hero compass>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Today · {fmtDateShort(new Date())}</Eyebrow>
          <Row gap={10}>
            <Row gap={6}>
              <Dot color="ok" size={6} />
              <Txt size={11} weight={700} color="heroMuted">
                Synced
              </Txt>
            </Row>
            <LookPill />
          </Row>
        </Row>

        <Row gap={14}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.btn2,
              borderWidth: 1,
              borderColor: t.colors.btn2Border,
            }}>
            <Icon name="anchor" size={24} color="heroFg" strokeWidth={1.8} />
          </View>
          <Col gap={3} flex={1}>
            <Display size={38} color="heroFg" numberOfLines={1}>
              {vessel.name}
            </Display>
            <Txt size={14} color="heroMuted">
              {vessel.position} · {vessel.place}
            </Txt>
          </Col>
        </Row>

        <Col gap={12} style={{ marginTop: 2 }}>
          {voyage ? <LiveCard voyage={voyage} /> : <Button label="Start voyage" icon="send" onPress={onStart} />}
          {loggedToday ? (
            <Button variant="hero" icon="check" iconStrokeWidth={2.4} label="Logged · view entry" onPress={() => router.navigate('/log')} />
          ) : (
            <Button variant="hero" icon="mic" iconStrokeWidth={2} label="Log today" onPress={() => router.navigate('/log')} />
          )}
        </Col>
      </Hero>

      <Sheet gap={12}>
        <FadeUp delay={50}>
          <Card onPress={() => router.navigate('/experience')} accessibilityLabel="My experience">
            <Row justify="space-between">
              <Eyebrow>My experience</Eyebrow>
              <Txt size={12} weight={800} color="brass">
                {experience.weekDelta}
              </Txt>
            </Row>
            <Row gap={8} align="flex-start">
              <Stat value={fmtInt(totals.nm)} label="NM logged" />
              <Stat value={fmtInt(totals.hours)} label="hours underway" />
              <Stat value={fmtInt(totals.nightHours)} label="night hours" />
            </Row>
            <Col gap={6}>
              <Row gap={4} align="flex-end" style={{ height: 40 }}>
                {experience.months.map((h, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      borderRadius: 3,
                      backgroundColor: i === experience.months.length - 1 ? t.colors.accent : t.colors.track,
                    }}
                  />
                ))}
              </Row>
              <Row justify="space-between">
                <Txt size={11} weight={600} color="muted">
                  {experience.monthsFrom}
                </Txt>
                <Txt size={11} weight={600} color="muted">
                  {experience.monthsTo}
                </Txt>
              </Row>
            </Col>
          </Card>
        </FadeUp>

        <FadeUp delay={120}>
          <Card row gap={10} paddingV={14} onPress={() => router.navigate('/documents')} accessibilityLabel="Documents">
            <Icon name="file" size={20} color="muted" />
            <Txt size={15} weight={700} style={{ flex: 1 }}>
              Documents
            </Txt>
            <Dot color="ok" />
            <Txt size={13} weight={600} color="muted">
              {docCounts.valid} valid
            </Txt>
            <View style={{ marginLeft: 4 }}>
              <Dot color="warn" />
            </View>
            <Txt size={13} weight={600} color="muted">
              {docCounts.expiring} expiring
            </Txt>
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        </FadeUp>

        <FadeUp delay={190}>
          <Card row gap={14} paddingV={14} onPress={() => router.navigate('/experience')} accessibilityLabel={qualification.name}>
            <Ring size={64} stroke={6} value={qualification.pct}>
              <Txt size={14} weight={800} tabular>
                {Math.round(qualification.pct * 100)}%
              </Txt>
            </Ring>
            <Col gap={4} flex={1}>
              <Txt size={15} weight={700}>
                {qualification.name}
              </Txt>
              <Txt size={12} color="muted">
                {qualification.summary}
              </Txt>
              <Txt size={12} weight={700} color="brass">
                {qualification.done}
              </Txt>
            </Col>
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Col gap={4} flex={1}>
      <Display size={32} tabular ls={-0.64} numberOfLines={1}>
        {value}
      </Display>
      <Txt size={12} color="muted">
        {label}
      </Txt>
    </Col>
  );
}

/** Replaces the Start button while a voyage is running. */
function LiveCard({ voyage }: { voyage: LiveVoyage }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={() => router.push('/live')}
      accessibilityRole="button"
      accessibilityLabel="View live voyage"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 12,
          paddingLeft: 18,
          paddingRight: 14,
          borderRadius: t.radius.lg,
          backgroundColor: t.colors.btn2,
          borderWidth: 1,
          borderColor: t.colors.accent,
          boxShadow: t.shadows.button,
        },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      <Blink>
        <Dot color="accent" size={10} />
      </Blink>
      <Col gap={3} flex={1}>
        <Eyebrow color="heroMuted">Underway · to {voyage.to}</Eyebrow>
        <Row gap={8} align="baseline">
          <Display size={30} tabular ls={-0.6} color="heroFg">
            {voyage.nm.toFixed(1)}
          </Display>
          <Txt size={13} weight={700} color="heroMuted" tabular>
            NM · {fmtDur(voyage.elapsedMin)}
          </Txt>
        </Row>
      </Col>
      <View style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 99, backgroundColor: t.colors.accent }}>
        <Eyebrow size={11} ls={1.1} color="accentFg">
          View
        </Eyebrow>
      </View>
    </Pressable>
  );
}
