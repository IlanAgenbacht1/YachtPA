import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { TrackMap } from '@/components/TrackMap';
import { Button, Card, Col, Display, Eyebrow, Field, Hero, HeroButton, Row, Sheet, Spacer, Tag, Tile, Txt } from '@/components/ui';
import { deleteVoyage, getTrack, getVoyage, renameVoyage, setVoyageSkipper } from '@/db/repo';
import { fmtDur, fmtSpan } from '@/lib/format';
import { useAppStore, useQuery } from '@/store/AppStore';
import { goBack } from '@/lib/nav';

export default function VoyageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bump, flash } = useAppStore();
  const v = useQuery(() => getVoyage(id), [id]);
  const fixes = useQuery(() => getTrack(id), [id]);
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  if (!v) return null;

  const startEdit = () => {
    setFrom(v.fromName ?? '');
    setTo(v.toName ?? '');
    setEditing(true);
  };
  const saveNames = async () => {
    await renameVoyage(v.id, from.trim() || 'Unknown', to.trim() || 'Unknown');
    setEditing(false);
    bump();
    flash('Place names saved');
  };

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
          goBack();
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
            {v.source === 'sim' ? ' · pretend (testing)' : ''}
          </Eyebrow>
          <HeroButton />
        </Row>
        <Display size={(v.fromName ?? '').length + (v.toName ?? '').length > 30 ? 26 : 32} color="heroFg" numberOfLines={3}>
          {v.fromName} → {v.toName}
        </Display>
        <Txt size={14} color="heroMuted">
          {fmtSpan(started, ended, v.source === 'manual')}
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
        {editing ? (
          <Card gap={12}>
            <Field label="From" value={from} onChangeText={setFrom} autoCapitalize="words" />
            <Field label="To" value={to} onChangeText={setTo} autoCapitalize="words" />
            <Button label="Save names" icon="check" onPress={saveNames} />
          </Card>
        ) : (
          <Button variant="ghost" label="Edit place names" onPress={startEdit} />
        )}
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
