import { router } from 'expo-router';
import { useState } from 'react';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, DateInput, Field, Input, num, Row, Sheet, Toggle, Txt } from '@/components/ui';
import { newId } from '@/db/db';
import { dayStart, isDayKey } from '@/domain/dates';
import { voyageFlags } from '@/domain/sanity';
import { isSkipperPosition, type Voyage } from '@/domain/types';
import { manualSegment, passageTypeOf } from '@/domain/voyage';
import { useAppStore } from '@/store/AppStore';

function parseClock(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2})[:.]?(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** A voyage entered by hand: past passages, or when GPS was not running. */
export default function NewVoyageScreen() {
  const s = useAppStore();
  const [engagementId, setEngagementId] = useState(s.active?.id ?? s.engagements[s.engagements.length - 1]?.id ?? '');
  const [date, setDate] = useState(s.today);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [nm, setNm] = useState('');
  const [nightH, setNightH] = useState('');
  const [overnight, setOvernight] = useState(false);
  const eng = s.engagements.find((e) => e.id === engagementId);
  const [skipper, setSkipper] = useState(eng ? isSkipperPosition(eng.position) : false);
  const [error, setError] = useState('');

  const onSave = async () => {
    const a = parseClock(start);
    const b = parseClock(end);
    const dist = num(nm);
    const night = num(nightH) ?? 0;
    if (!eng) return setError('Pick the yacht this voyage was on.');
    if (!isDayKey(date)) return setError('Date must be YYYY-MM-DD.');
    if (a === null || b === null) return setError('Times must be like 09:30.');
    if (dist === null || dist <= 0) return setError('Enter the distance in NM.');
    const startedAt = dayStart(date) + a * 60_000;
    let endedAt = dayStart(date) + b * 60_000;
    if (endedAt <= startedAt) endedAt += 86_400_000; // arrived the next day
    const durationMin = (endedAt - startedAt) / 60_000;
    if (night * 60 > durationMin) return setError('Night hours cannot be longer than the voyage.');
    const seg = manualSegment(startedAt, endedAt, dist, night * 60, overnight);
    const avgKn = dist / (durationMin / 60);
    const v: Voyage = {
      id: newId(),
      engagementId: eng.id,
      startedAt,
      endedAt,
      startLat: null,
      startLon: null,
      endLat: null,
      endLon: null,
      startPlace: from.trim(),
      endPlace: to.trim(),
      distanceNm: dist,
      directNm: dist,
      durationMin,
      underwayMin: durationMin,
      nightMin: night * 60,
      avgKn,
      maxKn: 0,
      passageType: passageTypeOf([seg]),
      asSkipper: skipper,
      source: 'manual',
      status: 'draft',
      flags: voyageFlags({ source: 'manual', durationMin, avgKn, fixes: 0, start: null, previousEnd: null }),
      segments: [seg],
      notes: '',
      updatedAt: Date.now(),
    };
    await s.saveVoyage(v);
    router.replace(`/voyage/${v.id}`);
  };

  return (
    <Screen>
      <BackHero eyebrow="Add voyage" title="Enter by hand" subtitle="For passages logged without GPS" />
      <Sheet gap={14} paddingBottom={32}>
        <Card gap={14}>
          <Field label="Yacht">
            <Row gap={8} wrap>
              {s.engagements.map((e) => (
                <Chip
                  key={e.id}
                  label={`${s.vessels.find((v) => v.id === e.vesselId)?.name ?? '?'} · ${e.position}`}
                  selected={e.id === engagementId}
                  onPress={() => {
                    setEngagementId(e.id);
                    setSkipper(isSkipperPosition(e.position));
                  }}
                />
              ))}
            </Row>
          </Field>
          <Field label="Date">
            <DateInput value={date} onChange={setDate} />
          </Field>
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Departed">
                <Input value={start} onChangeText={setStart} placeholder="09:30" keyboardType="numbers-and-punctuation" />
              </Field>
            </Col>
            <Col flex={1}>
              <Field label="Arrived">
                <Input value={end} onChangeText={setEnd} placeholder="17:45" keyboardType="numbers-and-punctuation" />
              </Field>
            </Col>
          </Row>
          <Field label="From">
            <Input value={from} onChangeText={setFrom} placeholder="Departure port" autoCapitalize="words" />
          </Field>
          <Field label="To">
            <Input value={to} onChangeText={setTo} placeholder="Arrival port" autoCapitalize="words" />
          </Field>
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Distance (NM)">
                <Input value={nm} onChangeText={setNm} placeholder="0" keyboardType="decimal-pad" />
              </Field>
            </Col>
            <Col flex={1}>
              <Field label="Night hours">
                <Input value={nightH} onChangeText={setNightH} placeholder="0" keyboardType="decimal-pad" />
              </Field>
            </Col>
          </Row>
          <Toggle label="Overnight passage" detail="Underway through a whole night" value={overnight} onChange={setOvernight} />
          <Toggle label="I was skipper" value={skipper} onChange={setSkipper} />
        </Card>
        {error ? (
          <Txt size={13} weight={700} color="danger">
            {error}
          </Txt>
        ) : null}
        <Button label="Continue" icon="check" iconStrokeWidth={2.4} height={58} onPress={onSave} />
        <Txt size={12} color="muted" align="center">
          Entered by hand · {s.today === date ? 'today' : date}. Marked as manual on your record.
        </Txt>
      </Sheet>
    </Screen>
  );
}
