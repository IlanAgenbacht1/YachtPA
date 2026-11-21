import { router } from 'expo-router';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Eyebrow, Icon, Row, Sheet, Txt } from '@/components/ui';
import { fmtDay } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

/** Every yacht worked on, with each engagement (position and dates) on it. */
export default function VesselsScreen() {
  const t = useTokens();
  const s = useAppStore();

  return (
    <Screen>
      <BackHero eyebrow="Vessels and engagements" title="My yachts" subtitle="Your history stays with you when you change boats" />
      <Sheet gap={12} paddingBottom={32}>
        {s.vessels.length === 0 && (
          <Txt size={14} color="muted">
            Add the yacht you are on now. Past yachts can be added too.
          </Txt>
        )}
        {[...s.vessels].reverse().map((v) => {
          const engs = s.engagements.filter((e) => e.vesselId === v.id).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
          return (
            <Card key={v.id} gap={10}>
              <Row gap={10} justify="space-between">
                <Col flex={1} gap={2}>
                  <Txt size={17} weight={700}>
                    {v.name}
                  </Txt>
                  <Txt size={12} color="muted">
                    {[v.propulsion === 'sail' ? 'Sailing yacht' : 'Motor yacht', v.loaM ? `${v.loaM} m` : null, v.gt ? `${v.gt} GT` : null, v.flag || null].filter(Boolean).join(' · ')}
                  </Txt>
                </Col>
                <Txt size={13} weight={800} color="accent" onPress={() => router.push({ pathname: '/vessel', params: { id: v.id } })}>
                  Edit
                </Txt>
              </Row>
              {engs.map((e) => (
                <Card
                  key={e.id}
                  row
                  gap={10}
                  paddingV={12}
                  paddingH={14}
                  borderColor={e.id === s.active?.id ? 'accent' : 'cardBorder'}
                  onPress={() => router.push({ pathname: '/engagement', params: { id: e.id } })}
                  accessibilityLabel={`${e.position} on ${v.name}`}>
                  <Col flex={1} gap={2}>
                    <Txt size={14} weight={700}>
                      {e.position}
                      {e.id === s.active?.id ? ' · current' : ''}
                    </Txt>
                    <Txt size={12} color="muted">
                      {fmtDay(e.startDate)} – {e.endDate ? fmtDay(e.endDate) : 'present'}
                      {e.captain ? ` · Capt. ${e.captain}` : ''}
                    </Txt>
                  </Col>
                  <Icon name="chevronRight" size={16} color="muted" />
                </Card>
              ))}
              <Txt
                size={13}
                weight={700}
                color="accent"
                style={{ paddingVertical: 4, borderTopWidth: engs.length ? 0 : 1, borderTopColor: t.colors.cardBorder }}
                onPress={() => router.push({ pathname: '/engagement', params: { vesselId: v.id } })}>
                + Add position on {v.name}
              </Txt>
            </Card>
          );
        })}
        <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a yacht" onPress={() => router.push('/vessel')} />
        <Eyebrow style={{ marginTop: 8 }}>Tip</Eyebrow>
        <Txt size={12} color="muted">
          Length (LOA) and gross tonnage matter: the RYA only counts some sea time on yachts under 24 m or up to 500 GT.
        </Txt>
      </Sheet>
    </Screen>
  );
}
