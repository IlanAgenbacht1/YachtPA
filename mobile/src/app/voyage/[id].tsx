import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Switch, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { TrackMap } from '@/components/TrackMap';
import { Button, Card, Col, Display, Eyebrow, Hero, HeroButton, Row, Sheet, Spacer, Tag, Tile, Txt } from '@/components/ui';
import { deleteVoyage, getTrack, getVoyage, setVoyageSkipper } from '@/db/repo';
import { fmtClock, fmtDateShort, fmtDur, minutesOfDay } from '@/lib/format';
import { useAppStore, useQuery } from '@/store/AppStore';

export default function VoyageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bump } = useAppStore();
  const v = useQuery(() => getVoyage(id), [id]);
  const fixes = useQuery(() => getTrack(id), [id]);
  if (!v) return null;

  const started = new Date(v.startedAt);
  const ended = new Date(v.endedAt ?? v.startedAt);

  const onDelete = () => {
    Alert.alert('Delete this voyage?', 'It is removed from your record and totals.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteVoyage(v.id);
          bump();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">
            {v.vesselName}
            {v.source === 'sim' ? ' · simulated' : ''}
          </Eyebrow>
          <HeroButton />
        </Row>
        <Display size={32} color="heroFg" numberOfLines={2}>
          {v.fromName} → {v.toName}
        </Display>
        <Txt size={14} color="heroMuted">
          {fmtDateShort(started)} · {fmtClock(minutesOfDay(started))} – {fmtClock(minutesOfDay(ended))}
        </Txt>
      </Hero>
      <Sheet gap={12} paddingTop={24}>
        <Row gap={10} align="baseline">
          <Display size={64} tabular>
            {v.distanceNm.toFixed(1)}
          </Display>
          <Txt size={18} weight={700} color="muted">
            NM
          </Txt>
        </Row>
        {fixes && fixes.length > 1 && (
          <Card paddingV={12} paddingH={12}>
            <TrackMap fixes={fixes} />
          </Card>
        )}
        <Row gap={10} align="stretch">
          <View style={{ flex: 1 }}>
            <Tile label="Underway" value={fmtDur(v.underwayMin)} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile label="Night hours" value={fmtDur(v.nightMin)} />
          </View>
        </Row>
        <Row gap={10} align="stretch">
          <View style={{ flex: 1 }}>
            <Tile label="Avg speed" value={`${v.avgKn.toFixed(1)} kn`} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile label="Max speed" value={`${v.maxKn.toFixed(1)} kn`} />
          </View>
        </Row>
        <Row gap={8} wrap>
          <Tag accent label={v.overnight ? 'Overnight passage' : v.nightMin > 0 ? 'Night passage' : 'Day passage'} />
          <Tag label={v.status === 'confirmed' ? 'Confirmed' : v.status} />
        </Row>
        <Card row gap={12} paddingV={12}>
          <Col gap={2} flex={1}>
            <Txt size={15} weight={600}>
              I was skipper
            </Txt>
            <Txt size={12} color="muted">
              Counts towards days and passages as skipper.
            </Txt>
          </Col>
          <Switch
            value={v.skipper}
            onValueChange={async (on) => {
              await setVoyageSkipper(v.id, on);
              bump();
            }}
          />
        </Card>
        <Spacer />
        <Button variant="ghost" label="Delete voyage" onPress={onDelete} />
      </Sheet>
    </Screen>
  );
}
