import { router } from 'expo-router';
import { View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Dot, Eyebrow, Hero, Icon, Ring, Row, Sheet, Tile, Txt } from '@/components/ui';
import { vesselHistory } from '@/domain/experience';
import { fmtDay, fmtInt, fmtMonth, fmtNm } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function ExperienceScreen() {
  const t = useTokens();
  const s = useAppStore();
  const e = s.exp;
  const totalProp = e.byPropulsion.motor + e.byPropulsion.sail;
  const motorPct = totalProp ? Math.round((e.byPropulsion.motor / totalProp) * 100) : 100;
  const history = vesselHistory({ vessels: s.vessels, engagements: s.engagements, voyages: s.voyages, entries: s.entries });

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">My experience</Eyebrow>
        <Row gap={10} align="baseline">
          <Display size={66} lh={64} ls={-1.32} tabular color="heroFg">
            {fmtInt(e.nm)}
          </Display>
          <Txt size={20} weight={700} color="heroMuted">
            NM
          </Txt>
        </Row>
        <Txt size={14} color="heroMuted">
          {e.since ? `Since ${fmtMonth(e.since)} · ${e.vessels} ${e.vessels === 1 ? 'vessel' : 'vessels'}` : 'Confirmed voyages add up here'}
        </Txt>
      </Hero>

      <Sheet gap={12} paddingBottom={32}>
        {s.quals.map((q, i) => (
          <FadeUp key={q.def.id} delay={50 + i * 60}>
            <Card gap={14} onPress={() => router.push(`/qualification/${q.def.id}`)} accessibilityLabel={q.def.name}>
              <Row gap={16}>
                <Ring size={84} stroke={8} value={q.pct}>
                  <Col align="center">
                    <Display size={24} tabular>
                      {Math.round(q.pct * 100)}%
                    </Display>
                  </Col>
                </Ring>
                <Col gap={5} flex={1}>
                  <Eyebrow>
                    {q.def.authority} · {q.discipline === 'sail' ? 'Sail' : 'Power'}
                  </Eyebrow>
                  <Txt size={17} weight={700} lh={20}>
                    {q.def.name}
                  </Txt>
                  <Txt size={13} weight={700} color="brass">
                    {q.appearsToMeet ? 'Appears to meet the logged requirements' : `${q.results.filter((r) => r.met).length} of ${q.results.filter((r) => r.met !== null).length} requirements met`}
                  </Txt>
                </Col>
                <Icon name="chevronRight" size={18} color="muted" />
              </Row>
            </Card>
          </FadeUp>
        ))}

        <FadeUp delay={170}>
          <Col gap={10}>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Hours underway" value={fmtInt(e.underwayHours)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Night hours" value={fmtInt(e.nightHours)} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Sea days" value={fmtInt(e.seaDays)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Days aboard" value={fmtInt(e.daysAboard)} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Longest passage" value={`${fmtNm(e.longestPassageNm)} NM`} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="Largest vessel" value={e.largestVesselM ? `${Math.round(e.largestVesselM)} m` : '–'} valueSize={22} />
              </View>
            </Row>
            <Row gap={10} align="stretch">
              <View style={{ flex: 1 }}>
                <Tile label="Night watches" value={fmtInt(e.nightWatches)} valueSize={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Tile label="In command" value={`${fmtInt(e.commandNm)} NM`} valueSize={22} />
              </View>
            </Row>
          </Col>
        </FadeUp>

        {totalProp > 0 && (
          <FadeUp delay={230}>
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
                    Motor · {fmtInt(e.byPropulsion.motor)} NM
                  </Txt>
                </Row>
                <Row gap={6}>
                  <Dot color="brass" />
                  <Txt size={12} weight={600} color="muted">
                    Sail · {fmtInt(e.byPropulsion.sail)} NM
                  </Txt>
                </Row>
              </Row>
            </Card>
          </FadeUp>
        )}

        {totalProp > 0 && (
          <FadeUp delay={270}>
            <Card gap={14} paddingV={14}>
              <Breakdown title="By vessel size" rows={e.bySize} total={totalProp} />
              <Breakdown title="By position" rows={e.byPosition} total={totalProp} />
              <Breakdown
                title="By passage"
                rows={[
                  { label: 'Day', nm: e.byPassage.day },
                  { label: 'Night', nm: e.byPassage.night },
                  { label: 'Overnight', nm: e.byPassage.overnight },
                ].filter((r) => r.nm > 0)}
                total={totalProp}
              />
            </Card>
          </FadeUp>
        )}

        <FadeUp delay={310}>
          <Col gap={10}>
            <Eyebrow>Vessel history</Eyebrow>
            {history.length === 0 && (
              <Txt size={14} color="muted">
                No vessels yet.
              </Txt>
            )}
            {history.map((h) => (
              <Card key={h.engagement.id} row gap={12} paddingV={14} onPress={() => router.push({ pathname: '/engagement', params: { id: h.engagement.id } })} accessibilityLabel={h.vessel?.name}>
                <Col flex={1} gap={2}>
                  <Txt size={15} weight={700}>
                    {h.vessel?.name ?? '—'}
                  </Txt>
                  <Txt size={12} color="muted">
                    {h.engagement.position} · {fmtDay(h.engagement.startDate)} – {h.engagement.endDate ? fmtDay(h.engagement.endDate) : 'present'}
                  </Txt>
                </Col>
                <Col align="flex-end" gap={2}>
                  <Txt size={15} weight={800} tabular>
                    {fmtInt(h.nm)} NM
                  </Txt>
                  <Txt size={12} color="muted">
                    {h.seaDays} sea days
                  </Txt>
                </Col>
              </Card>
            ))}
          </Col>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; nm: number }[]; total: number }) {
  const t = useTokens();
  if (!rows.length) return null;
  return (
    <Col gap={8}>
      <Eyebrow>{title}</Eyebrow>
      {rows.map((r) => (
        <Col key={r.label} gap={4}>
          <Row justify="space-between">
            <Txt size={13} weight={600}>
              {r.label}
            </Txt>
            <Txt size={13} weight={700} tabular color="muted">
              {fmtInt(r.nm)} NM
            </Txt>
          </Row>
          <View style={{ height: 6, borderRadius: 99, backgroundColor: t.colors.track, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(2, (r.nm / total) * 100)}%`, height: 6, backgroundColor: t.colors.accent }} />
          </View>
        </Col>
      ))}
    </Col>
  );
}
