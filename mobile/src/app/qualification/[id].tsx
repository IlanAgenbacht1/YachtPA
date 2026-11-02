import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Card, Col, Display, Eyebrow, Hero, HeroButton, Icon, Ring, Row, Segmented, Sheet, Txt } from '@/components/ui';
import type { RuleResult } from '@/domain/qualifications';
import { fmtIsoMedium, fmtNum } from '@/lib/format';
import { getQualificationResults, qualHeadline, qualTitle, setDiscipline, toggleCheck } from '@/lib/quals';
import { useAppStore, useQuery } from '@/store/AppStore';
import { useTokens } from '@/theme';

/** One qualification: progress, each requirement, the checklist, and the official source. */
export default function QualificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bump } = useAppStore();
  const t = useTokens();
  const results = useQuery(getQualificationResults);
  const r = results?.find((x) => x.qualification.id === id);
  if (!r) return null;
  const q = r.qualification;
  const sea = r.rules.filter((x) => x.rule.kind !== 'document' && x.rule.kind !== 'check');
  const other = r.rules.filter((x) => x.rule.kind === 'document' || x.rule.kind === 'check');

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">{q.authority} · last {q.windowYears} years</Eyebrow>
          <HeroButton />
        </Row>
        <Display size={32} color="heroFg">
          {qualTitle(r)}
        </Display>
        <Txt size={14} color="heroMuted">
          {qualHeadline(r)}
        </Txt>
      </Hero>
      <Sheet gap={14} paddingTop={24}>
        <Card row gap={16}>
          <Ring size={88} stroke={8} value={r.progress}>
            <Txt size={18} weight={800} tabular>
              {Math.round(r.progress * 100)}%
            </Txt>
          </Ring>
          <Col gap={4} flex={1}>
            <Txt size={15} weight={700}>
              {r.seaTimeMet ? 'Sea time appears to meet the minimums' : 'Sea time so far'}
            </Txt>
            <Txt size={12} color="muted">
              From your confirmed voyages on {r.discipline === 'sail' ? 'sailing' : 'motor'} yachts. Simulated voyages never count.
            </Txt>
          </Col>
        </Card>

        <Segmented
          label="Discipline"
          value={r.discipline}
          onChange={async (d) => {
            await setDiscipline(d);
            bump();
          }}
          options={[
            { value: 'power', label: 'Power' },
            { value: 'sail', label: 'Sail' },
          ]}
        />

        <Card gap={12}>
          <Eyebrow>Sea time</Eyebrow>
          {sea.map((x) => (
            <SeaRow key={x.rule.id} x={x} />
          ))}
        </Card>

        <Card gap={4} paddingH={8}>
          <View style={{ paddingHorizontal: 10, paddingTop: 2, paddingBottom: 6 }}>
            <Eyebrow>Also needed</Eyebrow>
          </View>
          {other.map((x) => (
            <Pressable
              key={x.rule.id}
              disabled={x.rule.kind !== 'check'}
              onPress={async () => {
                await toggleCheck(q.id, x.rule.id);
                bump();
              }}
              accessibilityRole={x.rule.kind === 'check' ? 'checkbox' : undefined}
              accessibilityState={{ checked: x.met }}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12 }, pressed && { backgroundColor: t.colors.track }]}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: x.met ? t.colors.ok : t.colors.cardBorder,
                  backgroundColor: x.met ? t.colors.ok : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {x.met && <Icon name="check" size={16} color="accentFg" strokeWidth={3} />}
              </View>
              <Col gap={2} flex={1}>
                <Txt size={14} weight={600}>
                  {x.rule.label}
                </Txt>
                <Txt size={12} color="muted">
                  {x.rule.kind === 'document' ? (x.met ? 'In your documents and in date' : 'Add it under Documents') : 'Tick when you have checked this yourself'}
                </Txt>
              </Col>
            </Pressable>
          ))}
        </Card>

        {r.unknownSize && (
          <Txt size={12} color="warn">
            Some voyages are on a yacht without length or gross tonnage set. They were counted; set the size under Profile → Vessel and position to be sure.
          </Txt>
        )}
        <Txt size={12} color="muted">
          {q.note} A day counts with at least 4 hours underway. A passage counts when both the track and the straight line from start to finish reach the distance. The examiner decides; YachtPA only shows what your record appears to meet.
        </Txt>
        <Pressable onPress={() => Linking.openURL(q.sourceUrl)} accessibilityRole="link">
          <Txt size={13} weight={700} color="accent">
            Official requirements on rya.org.uk · checked {fmtIsoMedium(q.verifiedOn)}
          </Txt>
        </Pressable>
      </Sheet>
    </Screen>
  );
}

function SeaRow({ x }: { x: RuleResult }) {
  const t = useTokens();
  const pct = Math.min(1, x.value / x.target);
  const value = x.rule.kind === 'miles' || x.rule.kind === 'nightHours' ? fmtNum(x.value) : String(Math.floor(x.value));
  return (
    <Col gap={6}>
      <Row justify="space-between">
        <Row gap={6} flex={1}>
          {x.met && <Icon name="check" size={16} color="ok" strokeWidth={2.6} />}
          <Txt size={14} weight={600} style={{ flexShrink: 1 }}>
            {x.rule.label}
          </Txt>
        </Row>
        <Txt size={14} weight={800} tabular>
          {value} / {x.target.toLocaleString('en-GB')}
        </Txt>
      </Row>
      <View style={{ height: 6, borderRadius: 99, backgroundColor: t.colors.track, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: x.met ? t.colors.ok : t.colors.accent }} />
      </View>
      {x.detail ? (
        <Txt size={12} color="muted">
          {x.detail}
        </Txt>
      ) : null}
    </Col>
  );
}
