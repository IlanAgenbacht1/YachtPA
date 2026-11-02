import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Dot, Eyebrow, Hero, Row, Sheet, Tile, Txt } from '@/components/ui';
import { getExperience, type Breakdown } from '@/db/repo';
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
        {exp.voyages > 0 && (
          <FadeUp delay={170}>
            <BreakdownCard title="By passage type" rows={exp.byPassage} />
          </FadeUp>
        )}
        {exp.voyages > 0 && (
          <FadeUp delay={210}>
            <BreakdownCard title="By vessel size" rows={exp.bySize} />
          </FadeUp>
        )}
        {exp.byPosition.length > 1 && (
          <FadeUp delay={250}>
            <BreakdownCard title="By position" rows={exp.byPosition} />
          </FadeUp>
        )}
      </Sheet>
    </Screen>
  );
}

/** Miles per category with a proportional bar; hours and voyage count underneath. */
function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  const t = useTokens();
  const max = Math.max(1e-9, ...rows.map((r) => r.nm));
  return (
    <Card gap={12} paddingV={14}>
      <Eyebrow>{title}</Eyebrow>
      {rows.map((r) => (
        <Col key={r.label} gap={6}>
          <Row justify="space-between">
            <Txt size={14} weight={700}>
              {r.label}
            </Txt>
            <Txt size={14} weight={800} tabular>
              {fmtNum(r.nm)} NM
            </Txt>
          </Row>
          <View style={{ height: 6, borderRadius: 99, backgroundColor: t.colors.track, overflow: 'hidden' }}>
            <View style={{ width: `${(r.nm / max) * 100}%`, height: '100%', backgroundColor: t.colors.accent }} />
          </View>
          <Txt size={12} color="muted">
            {fmtNum(r.hours)} h underway · {r.voyages} voyage{r.voyages === 1 ? '' : 's'}
          </Txt>
        </Col>
      ))}
    </Card>
  );
}
