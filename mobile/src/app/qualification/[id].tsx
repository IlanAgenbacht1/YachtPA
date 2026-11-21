import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { BackHero } from '@/components/BackHero';
import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Card, Col, Display, Eyebrow, Icon, Ring, Row, Segmented, Sheet, Txt } from '@/components/ui';
import { QUALIFICATIONS } from '@/domain/qualData';
import { evaluate, verdict } from '@/domain/qualifications';
import type { Propulsion } from '@/domain/types';
import { fmtDay } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function QualificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTokens();
  const s = useAppStore();
  const def = QUALIFICATIONS.find((q) => q.id === id);
  const main = s.quals.find((q) => q.def.id === id);
  const [discipline, setDiscipline] = useState<Propulsion>(main?.discipline ?? 'motor');
  if (!def || !main) return <Redirect href="/experience" />;

  const p = evaluate(def, discipline, { vessels: s.vessels, engagements: s.engagements, voyages: s.voyages, entries: s.entries }, s.docs, s.today);

  return (
    <Screen>
      <BackHero eyebrow={def.authority} title={def.name} subtitle={`Logged in the last ${def.windowYears} years`} />
      <Sheet gap={14} paddingBottom={32}>
        <Segmented
          value={discipline}
          options={[
            { value: 'motor', label: 'Power' },
            { value: 'sail', label: 'Sail' },
          ]}
          onChange={setDiscipline}
        />

        <FadeUp>
          <Card row gap={16}>
            <Ring size={96} stroke={8} value={p.pct}>
              <Display size={28} tabular>
                {Math.round(p.pct * 100)}%
              </Display>
            </Ring>
            <Col flex={1} gap={6}>
              <Txt size={15} weight={700} lh={20}>
                {verdict(p)}
              </Txt>
              <Txt size={12} color="muted">
                YachtPA never certifies. Only the {def.authority.split(' ')[0]} can confirm you are eligible.
              </Txt>
            </Col>
          </Card>
        </FadeUp>

        <FadeUp delay={80}>
          <Card gap={0} paddingV={4}>
            {p.results.map((r, i) => (
              <View key={r.rule.id} style={{ paddingVertical: 12, gap: 4, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.colors.cardBorder }}>
                <Row gap={10}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: r.met ? t.colors.ok : 'transparent',
                      borderWidth: r.met ? 0 : 1.5,
                      borderColor: r.met === null ? t.colors.warn : t.colors.cardBorder,
                    }}>
                    {r.met ? <Icon name="check" size={14} color={t.colors.card} strokeWidth={3} /> : r.met === null ? <Txt size={13} weight={800} color="warn">?</Txt> : null}
                  </View>
                  <Txt size={14} weight={600} style={{ flex: 1 }}>
                    {r.rule.label}
                  </Txt>
                  <Txt size={14} weight={700} tabular color={r.met ? 'ok' : r.met === null ? 'warn' : 'fg'}>
                    {r.display}
                  </Txt>
                </Row>
                {r.note ? (
                  <Txt size={12} color="muted" style={{ marginLeft: 34 }}>
                    {r.note}
                  </Txt>
                ) : null}
              </View>
            ))}
          </Card>
        </FadeUp>

        <FadeUp delay={140}>
          <Card gap={8}>
            <Eyebrow>How YachtPA counts</Eyebrow>
            <Txt size={13} lh={19} color="muted">
              A day at sea is a day with at least 4 hours underway (RYA: 8 hours living aboard, mostly at sea). A qualifying passage is one
              non-stop stretch underway where both the distance run and the straight line from start to finish beat the minimum. Only voyages
              on {discipline === 'sail' ? 'sailing' : 'motor'} yachts count. Reduced-sea-time routes for holders of other certificates are not
              shown.
            </Txt>
          </Card>
        </FadeUp>

        <FadeUp delay={180}>
          <Col gap={8}>
            {[def.sourceUrl, ...(def.extraSources ?? [])].map((u) => (
              <Card key={u} row gap={10} paddingV={12} onPress={() => Linking.openURL(u)} accessibilityLabel="Open official source">
                <Icon name="external" size={18} color="accent" />
                <Txt size={13} weight={600} color="accent" style={{ flex: 1 }} numberOfLines={2}>
                  {u.replace('https://www.', '')}
                </Txt>
              </Card>
            ))}
            <Txt size={12} color="muted">
              Requirements v{def.version}, checked against the official page on {fmtDay(def.verifiedOn)}.
            </Txt>
          </Col>
        </FadeUp>
      </Sheet>
    </Screen>
  );
}
