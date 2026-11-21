import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BackHero } from '@/components/BackHero';
import { FadeUp, Rise, useProgress } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { TrackMap } from '@/components/TrackMap';
import { Button, Card, Display, Field, Icon, Input, num, Row, Sheet, Tag, Tile, Toggle, Txt } from '@/components/ui';
import { getTrack } from '@/db/repo';
import { dayKey } from '@/domain/dates';
import { flagMessage } from '@/domain/sanity';
import { isLocked, type Fix, type Voyage } from '@/domain/types';
import { manualSegment } from '@/domain/voyage';
import { fmtDay, fmtDur, fmtInt, fmtTime } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { useAppStore, useRecordContext } from '@/store/AppStore';

const PASSAGE_LABEL = { day: 'Day passage', night: 'Night passage', overnight: 'Overnight passage' } as const;
const STATUS_LABEL = { draft: 'Not confirmed', confirmed: 'Confirmed', requested: 'Sent for sign-off', signed: 'Signed' } as const;

export default function VoyageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useAppStore();
  const v = s.voyages.find((x) => x.id === id);
  const { engagement, vessel } = useRecordContext(v?.engagementId);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [from, setFrom] = useState(v?.startPlace ?? '');
  const [to, setTo] = useState(v?.endPlace ?? '');
  const [notes, setNotes] = useState(v?.notes ?? '');
  const [skipper, setSkipper] = useState(v?.asSkipper ?? false);
  const [manualNm, setManualNm] = useState('');
  const [armDelete, setArmDelete] = useState(false);
  const p = useProgress(1100, 250);

  useEffect(() => {
    if (id) getTrack(id).then(setFixes);
  }, [id]);

  if (!s.ready) return null;
  if (!v) return <Redirect href="/" />;
  if (v.endedAt === null) return <Redirect href="/live" />;

  const locked = isLocked(v.status);
  const noFixes = v.flags.some((f) => f.kind === 'no_fixes');
  const fresh = v.status === 'draft';

  const edited = (): Voyage => {
    let next: Voyage = { ...v, startPlace: from.trim(), endPlace: to.trim(), notes: notes.trim(), asSkipper: skipper };
    const nm = num(manualNm);
    if (noFixes && nm !== null && nm > 0) {
      const seg = manualSegment(v.startedAt, v.endedAt!, nm, 0, false);
      next = {
        ...next,
        source: 'manual',
        distanceNm: nm,
        directNm: nm,
        underwayMin: v.durationMin,
        avgKn: v.durationMin > 0 ? nm / (v.durationMin / 60) : 0,
        segments: [seg],
        flags: v.flags.filter((f) => f.kind !== 'no_fixes'),
      };
    }
    return next;
  };

  // Back to wherever this was opened from (Home after STOP, or the diary); never a second Home.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onConfirm = async () => {
    tick();
    await s.confirmVoyage(edited());
    leave();
  };

  const onSave = async () => {
    await s.saveVoyage(edited());
    s.flash('Voyage updated');
    leave();
  };

  const onDelete = async () => {
    if (!armDelete) {
      setArmDelete(true);
      return;
    }
    await s.deleteVoyage(v.id);
    s.flash('Voyage discarded');
    leave();
  };

  return (
    <Screen>
      <BackHero
        eyebrow={fresh ? 'Voyage complete' : 'Voyage'}
        title={`${v.startPlace || '—'} → ${v.endPlace || '—'}`}
        subtitle={`${fmtDay(dayKey(v.startedAt))} · ${fmtTime(v.startedAt)} – ${fmtTime(v.endedAt!)}`}
      />

      <Rise style={{ flex: 1 }}>
        <Sheet gap={14} paddingTop={24} paddingBottom={32}>
          <Row gap={10} align="baseline">
            <Display size={80} lh={78} ls={-1.6} tabular>
              {v.distanceNm < 100 ? (v.distanceNm * p).toFixed(1) : fmtInt(v.distanceNm * p)}
            </Display>
            <Txt size={20} weight={700} color="muted">
              NM
            </Txt>
          </Row>

          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Duration" value={fmtDur(v.durationMin * p)} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Night hours" value={fmtDur(v.nightMin * p)} />
            </View>
          </Row>
          <Row gap={10} align="stretch">
            <View style={{ flex: 1 }}>
              <Tile label="Avg speed" value={`${(v.avgKn * p).toFixed(1)} kn`} />
            </View>
            <View style={{ flex: 1 }}>
              <Tile label="Max speed" value={`${(v.maxKn * p).toFixed(1)} kn`} />
            </View>
          </Row>

          <Row gap={8} wrap>
            <Tag accent label={PASSAGE_LABEL[v.passageType]} />
            {vessel && <Tag label={vessel.propulsion === 'sail' ? 'Sailing yacht' : 'Motor yacht'} />}
            {engagement && <Tag label={engagement.position} />}
            <Tag label={`Underway ${fmtDur(v.underwayMin)}`} />
            <Tag label={STATUS_LABEL[v.status]} />
          </Row>

          {v.flags.map((f, i) => (
            <Card key={i} row gap={10} paddingV={12} borderColor="warn">
              <Icon name="alert" size={18} color="warn" />
              <Txt size={14} weight={600} style={{ flex: 1 }}>
                {flagMessage(f)}
              </Txt>
            </Card>
          ))}

          <FadeUp delay={200}>
            <Card gap={10}>
              <TrackMap fixes={fixes} height={150} />
            </Card>
          </FadeUp>

          {locked ? (
            <Card row gap={10}>
              <Icon name="lock" size={18} color="muted" />
              <Txt size={14} color="muted" style={{ flex: 1 }}>
                Sent for sign-off. This voyage can no longer be edited.
              </Txt>
            </Card>
          ) : (
            <FadeUp delay={260}>
              <Card gap={14}>
                <Field label="From">
                  <Input value={from} onChangeText={setFrom} placeholder="Departure port" autoCapitalize="words" />
                </Field>
                <Field label="To">
                  <Input value={to} onChangeText={setTo} placeholder="Arrival port" autoCapitalize="words" />
                </Field>
                {noFixes && (
                  <Field label="Distance (NM)" hint="No GPS was recorded. Enter the distance from the ship's log.">
                    <Input value={manualNm} onChangeText={setManualNm} placeholder="0" keyboardType="decimal-pad" />
                  </Field>
                )}
                <Toggle label="I was skipper" detail="Counts towards days and passages as skipper" value={skipper} onChange={setSkipper} />
                <Field label="Notes">
                  <Input value={notes} onChangeText={setNotes} placeholder="Optional" multiline minHeight={70} />
                </Field>
              </Card>
            </FadeUp>
          )}

          {!locked && (
            <>
              {fresh ? (
                <Button label="Confirm voyage" icon="check" iconStrokeWidth={2.4} onPress={onConfirm} />
              ) : (
                <Button label="Save changes" icon="check" iconStrokeWidth={2.4} height={58} onPress={onSave} />
              )}
              <Button variant="ghost" label={armDelete ? 'Tap again to discard this voyage' : 'Discard voyage'} onPress={onDelete} />
            </>
          )}
        </Sheet>
      </Rise>
    </Screen>
  );
}
