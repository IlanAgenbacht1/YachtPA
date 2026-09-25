import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Dot, Eyebrow, Hero, Ring, Row, Sheet, Tile, Txt } from '@/components/ui';
import { experience, qualification } from '@/data/sample';
import { fmtInt } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function ExperienceScreen() {
  const t = useTokens();
  const { totals } = useAppStore();
  const motor = experience.byType.motorNm;
  const sail = experience.byType.sailNm;
  const motorPct = Math.round((motor / (motor + sail)) * 100);

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">My experience</Eyebrow>
        <Row gap={10} align="baseline">
          <Display size={66} lh={64} ls={-1.32} tabular color="heroFg">
            {fmtInt(totals.nm)}
          </Display>
          <Txt size={20} weight={700} color="heroMuted">
            NM
          </Txt>
        </Row>
        <Txt size={14} color="heroMuted">
          {experience.since}
        </Txt>
      </Hero>

      <Sheet gap={12}>
        <FadeUp delay={50}>
          <Card gap={14}>
            <Row gap={16}>
              <Ring size={96} stroke={8} value={qualification.pct}>
                <Col align="center">
                  <Display size={28} tabular>
                    {Math.round(qualification.pct * 100)}%
                  </Display>
                  <Eyebrow size={10} ls={1}>
                    miles
                  </Eyebrow>
                </Col>
              </Ring>
              <Col gap={5} flex={1}>
                <Eyebrow>Next up</Eyebrow>
                <Txt size={17} weight={700} lh={20}>
                  {qualification.name}
                </Txt>
                <Txt size={13} weight={700} color="brass">
                  {qualification.toGo}
                </Txt>
              </Col>
            </Row>
            <Col gap={8} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: t.colors.cardBorder }}>
              {qualification.rows.map((r) => (
                <Row key={r.label} justify="space-between">
                  <Txt size={13} weight={600} color="muted">
                    {r.label}
                  </Txt>
                  <Txt size={13} weight={700} tabular>
                    {r.value}
                  </Txt>
                </Row>
              ))}
            </Col>
          </Card>
        </FadeUp>

        <FadeUp delay={120}>
          <Col gap={10}>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Hours underway" value={fmtInt(totals.hours)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Night hours" value={fmtInt(totals.nightHours)} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Longest passage" value={experience.longestPassage} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Largest vessel" value={experience.largestVessel} valueSize={22} />
              </View>
            </Row>
          </Col>
        </FadeUp>

        <FadeUp delay={190}>
          <Card gap={10} paddingV={14}>
            <Eyebrow>By vessel type</Eyebrow>
            <Row style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: t.colors.track }} align="stretch">
              <View style={{ width: `${motorPct}%`, backgroundColor: t.colors.accent }} />
              <View style={{ flex: 1, backgroundColor: t.colors.brass }} />
            </Row>
            <Row justify="space-between">
              <Row gap={6}>
                <Dot color="accent" />
                <Txt size={12} weight={600} color="muted">
                  Motor · {fmtInt(motor)} NM
                </Txt>
              </Row>
              <Row gap={6}>
                <Dot color="brass" />
                <Txt size={12} weight={600} color="muted">
                  Sail · {fmtInt(sail)} NM
                </Txt>
              </Row>
            </Row>
          </Card>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
