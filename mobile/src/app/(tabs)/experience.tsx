import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Dot, Eyebrow, Hero, Row, Sheet, Tile, Txt } from '@/components/ui';
import { getExperience } from '@/db/repo';
import { fmtInt, fmtNum, fmtIsoMonth, fmtLoa } from '@/lib/format';
import { useQuery } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function ExperienceScreen() {
  const t = useTokens();
  const exp = useQuery(getExperience);
  if (!exp) return null;
  const motor = exp.motorNm;
  const sail = exp.sailNm;
  const motorPct = motor + sail > 0 ? Math.round((motor / (motor + sail)) * 100) : 50;
  const since = [
    exp.since ? `Since ${fmtIsoMonth(exp.since)}` : null,
    `${exp.vessels} vessel${exp.vessels === 1 ? '' : 's'}`,
    `${exp.voyages} voyage${exp.voyages === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">My experience</Eyebrow>
        <Row gap={10} align="baseline">
          <Display size={66} lh={64} ls={-1.32} tabular color="heroFg">
            {fmtNum(exp.nm)}
          </Display>
          <Txt size={20} weight={700} color="heroMuted">
            NM
          </Txt>
        </Row>
        <Txt size={14} color="heroMuted">
          {since}
        </Txt>
      </Hero>

      <Sheet gap={12}>
        <FadeUp delay={50}>
          <Col gap={10}>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Sea days" value={fmtInt(exp.seaDays)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Voyages" value={fmtInt(exp.voyages)} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Hours underway" value={fmtNum(exp.underwayHours)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Night hours" value={fmtNum(exp.nightHours)} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Longest passage" value={`${fmtNum(exp.longestNm)} NM`} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Largest vessel" value={fmtLoa(exp.largestLoaM)} valueSize={22} />
              </View>
            </Row>
          </Col>
        </FadeUp>

        <FadeUp delay={120}>
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
                  Motor · {fmtNum(motor)} NM
                </Txt>
              </Row>
              <Row gap={6}>
                <Dot color="brass" />
                <Txt size={12} weight={600} color="muted">
                  Sail · {fmtNum(sail)} NM
                </Txt>
              </Row>
            </Row>
          </Card>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
