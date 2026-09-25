import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Rise, useProgress } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Col, Display, Eyebrow, Hero, Icon, Row, Sheet, Spacer, Tag, Tile, Txt } from '@/components/ui';
import { sanityFlags } from '@/domain';
import { confirm } from '@/lib/confirm';
import { fmtClockMs, fmtDateShort, fmtDur, fmtInt } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

const PASSAGE_LABEL = { day: 'Day passage', night: 'Night passage', overnight: 'Overnight passage' } as const;

export default function SummaryScreen() {
  const { draft, engagement, confirmVoyage, discardVoyage, flash, soon } = useAppStore();
  const [done, setDone] = useState(false);
  const p = useProgress(1100, 250);

  if (!draft && !done) return <Redirect href="/" />;
  if (!draft) return null;

  const onConfirm = async () => {
    tick();
    setDone(true);
    const added = await confirmVoyage();
    router.back();
    flash(`Voyage saved · ${added} NM added to your record`);
  };

  const onDiscard = async () => {
    const ok = await confirm('Discard this voyage?', 'The track and its numbers will be dropped. This cannot be undone.', 'Discard', 'Keep');
    if (!ok) return;
    setDone(true);
    await discardVoyage();
    router.back();
    flash('Voyage discarded');
  };

  const flags = sanityFlags({
    durationMin: draft.durationMin ?? 0,
    avgKn: draft.avgKn ?? 0,
    maxKn: draft.maxKn ?? 0,
    nm: draft.nm,
    fixes: draft.fixes,
  });
  const from = draft.start?.place ?? '—';
  const to = draft.end?.place ?? '—';
  const vesselType = engagement?.vessel.type === 'sail' ? 'Sailing yacht' : 'Motor yacht';

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Voyage complete</Eyebrow>
        <Display size={36} color="heroFg">
          {from} → {to}
        </Display>
        <Txt size={14} color="heroMuted">
          {fmtDateShort(new Date(draft.startedAt))} · {fmtClockMs(draft.startedAt)} – {draft.endedAt ? fmtClockMs(draft.endedAt) : '—'}
        </Txt>
      </Hero>

      <Rise style={{ flex: 1 }}>
        <Sheet gap={14} paddingTop={24} paddingBottom={24}>
          <Row gap={10} align="baseline">
            <Display size={80} lh={78} ls={-1.6} tabular>
              {fmtInt(draft.nm * p)}
            </Display>
            <Txt size={20} weight={700} color="muted">
              NM
            </Txt>
          </Row>

          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Duration" value={fmtDur((draft.durationMin ?? 0) * p)} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Night hours" value={fmtDur((draft.nightMin ?? 0) * p)} />
            </View>
          </Row>
          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Avg speed" value={`${((draft.avgKn ?? 0) * p).toFixed(1)} kn`} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Max speed" value={`${((draft.maxKn ?? 0) * p).toFixed(1)} kn`} />
            </View>
          </Row>

          <Row gap={8} wrap>
            <Tag accent label={PASSAGE_LABEL[draft.passage ?? 'day']} />
            <Tag label={vesselType} />
            {engagement ? <Tag label={engagement.position} /> : null}
            {draft.source === 'sim' ? <Tag label="Simulated" /> : null}
          </Row>

          {flags.length === 0 ? (
            <Row gap={8}>
              <Icon name="check" size={18} color="ok" strokeWidth={2.4} />
              <Txt size={13} weight={600} color="muted">
                Track looks consistent · {draft.fixes} fixes · {fmtDur(draft.underwayMin ?? 0)} underway
              </Txt>
            </Row>
          ) : (
            <Col gap={6}>
              {flags.map((f) => (
                <Row key={f} gap={8} align="flex-start">
                  <View style={{ marginTop: 1 }}>
                    <Icon name="chevronRight" size={16} color="warn" strokeWidth={2.4} />
                  </View>
                  <Txt size={13} weight={600} color="warn" style={{ flex: 1 }}>
                    {f}
                  </Txt>
                </Row>
              ))}
            </Col>
          )}

          <Spacer />
          <Button label="Confirm voyage" icon="check" iconStrokeWidth={2.4} onPress={onConfirm} />
          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" label="Edit details" onPress={soon} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="ghost" label="Discard" onPress={onDiscard} />
            </View>
          </Row>
        </Sheet>
      </Rise>
    </Screen>
  );
}
