import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Rise, useProgress } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Col, Display, Eyebrow, Field, Hero, Icon, Row, Sheet, Spacer, Tag, Tile, Txt } from '@/components/ui';
import { confirmVoyage, deleteVoyage, getTrack, getVoyage, lastKnownPosition, type Voyage } from '@/db/repo';
import { sanityCheck, summarise, type SanityFlag } from '@/domain/track';
import { fmtClock, fmtDateShort, fmtDur, fmtInt, minutesOfDay } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

/** Shown on STOP: the numbers, place names to correct, sanity checks, confirm. */
export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { current, bump, flash } = useAppStore();
  const [voyage, setVoyage] = useState<Voyage | null | undefined>(undefined);
  const [flags, setFlags] = useState<SanityFlag[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const p = useProgress(1100, 250);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const v = await getVoyage(id);
      setVoyage(v);
      if (!v) return;
      setFrom(v.fromName ?? '');
      setTo(v.toName ?? '');
      const [fixes, prev] = await Promise.all([getTrack(id), lastKnownPosition()]);
      setFlags(sanityCheck(summarise(fixes, { startedAt: v.startedAt, endedAt: v.endedAt ?? undefined }), prev));
    })();
  }, [id]);

  if (!id || voyage === null) return <Redirect href="/" />;
  if (!voyage) return null;

  const onConfirm = async () => {
    tick();
    await confirmVoyage(voyage.id, { from: from.trim() || 'Unknown', to: to.trim() || 'Unknown' });
    bump();
    router.dismissTo('/');
    flash(`Voyage saved · ${fmtInt(voyage.distanceNm)} NM added to your record`);
  };

  const onDiscard = () => {
    Alert.alert('Discard this voyage?', 'The track and its numbers are deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await deleteVoyage(voyage.id);
          bump();
          router.dismissTo('/');
        },
      },
    ]);
  };

  const started = new Date(voyage.startedAt);
  const ended = new Date(voyage.endedAt ?? voyage.startedAt);

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Voyage complete{voyage.source === 'sim' ? ' · simulated' : ''}</Eyebrow>
        <Display size={36} color="heroFg" numberOfLines={2}>
          {(from || '…') + ' → ' + (to || '…')}
        </Display>
        <Txt size={14} color="heroMuted">
          {fmtDateShort(started)} · {fmtClock(minutesOfDay(started))} – {fmtClock(minutesOfDay(ended))}
        </Txt>
      </Hero>

      <Rise style={{ flex: 1 }}>
        <Sheet gap={14} paddingTop={24} paddingBottom={24}>
          <Row gap={10} align="baseline">
            <Display size={80} lh={78} ls={-1.6} tabular>
              {voyage.distanceNm < 10 ? (voyage.distanceNm * p).toFixed(1) : fmtInt(voyage.distanceNm * p)}
            </Display>
            <Txt size={20} weight={700} color="muted">
              NM
            </Txt>
          </Row>

          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Underway" value={fmtDur(voyage.underwayMin * p)} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Night hours" value={fmtDur(voyage.nightMin * p)} />
            </View>
          </Row>
          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Avg speed" value={`${(voyage.avgKn * p).toFixed(1)} kn`} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Max speed" value={`${(voyage.maxKn * p).toFixed(1)} kn`} />
            </View>
          </Row>

          <Row gap={8} wrap>
            <Tag accent label={voyage.nightMin > 0 ? 'Night passage' : 'Day passage'} />
            {current && <Tag label={current.vessel.propulsion === 'sail' ? 'Sailing yacht' : 'Motor yacht'} />}
            {current && <Tag label={current.engagement.position} />}
          </Row>

          <Col gap={6}>
            {flags.map((f) => (
              <Row key={f.text} gap={8}>
                <Icon name={f.level === 'ok' ? 'check' : 'x'} size={18} color={f.level === 'ok' ? 'ok' : 'warn'} strokeWidth={2.4} />
                <Txt size={13} weight={600} color={f.level === 'ok' ? 'muted' : 'warn'} style={{ flex: 1 }}>
                  {f.text}
                </Txt>
              </Row>
            ))}
          </Col>

          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <Field label="From" value={from} onChangeText={setFrom} autoCapitalize="words" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="To" value={to} onChangeText={setTo} autoCapitalize="words" />
            </View>
          </Row>

          <Spacer />
          <Button label="Confirm voyage" icon="check" iconStrokeWidth={2.4} onPress={onConfirm} />
          <Button variant="ghost" label="Discard" onPress={onDiscard} />
        </Sheet>
      </Rise>
    </Screen>
  );
}
