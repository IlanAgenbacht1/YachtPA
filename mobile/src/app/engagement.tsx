import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, DateInput, Field, Input, Row, Sheet, Toggle, Txt } from '@/components/ui';
import { daysBetween, isDayKey } from '@/domain/dates';
import { useAppStore } from '@/store/AppStore';

const POSITIONS = ['Deckhand', 'Lead deckhand', 'Bosun', 'Mate', 'Chief officer', 'Captain', 'Engineer', 'Stewardess', 'Chef'];

/** A position on a yacht between two dates. Voyages and log entries attach to it. */
export default function EngagementScreen() {
  const { id, vesselId } = useLocalSearchParams<{ id?: string; vesselId?: string }>();
  const s = useAppStore();
  const e = s.engagements.find((x) => x.id === id) ?? null;
  const vessel = s.vessels.find((v) => v.id === (e?.vesselId ?? vesselId));
  const [position, setPosition] = useState(e?.position ?? '');
  const [startDate, setStartDate] = useState(e?.startDate ?? s.today);
  const [current, setCurrent] = useState(e ? e.endDate === null : true);
  const [endDate, setEndDate] = useState(e?.endDate ?? '');
  const [captain, setCaptain] = useState(e?.captain ?? '');
  const [company, setCompany] = useState(e?.company ?? '');
  const [error, setError] = useState('');
  const [armDelete, setArmDelete] = useState(false);

  if (!vessel) return null;

  const onSave = async () => {
    if (!position.trim()) return setError('Pick or type your position.');
    if (!isDayKey(startDate)) return setError('Start date must be YYYY-MM-DD.');
    if (!current && !isDayKey(endDate)) return setError('End date must be YYYY-MM-DD.');
    if (!current && daysBetween(startDate, endDate) < 0) return setError('End date is before the start date.');
    await s.saveEngagement({
      id: e?.id,
      createdAt: e?.createdAt,
      vesselId: vessel.id,
      position: position.trim(),
      startDate,
      endDate: current ? null : endDate,
      captain: captain.trim(),
      company: company.trim(),
    });
    router.back();
  };

  const onDelete = async () => {
    if (!e) return;
    if (!armDelete) return setArmDelete(true);
    const ok = await s.deleteEngagement(e.id);
    if (!ok) return setError('This position has voyages or log entries, so it stays in your history.');
    router.back();
  };

  return (
    <Screen>
      <BackHero eyebrow={vessel.name} title={e ? 'Edit position' : 'Your position'} />
      <Sheet gap={14} paddingBottom={32}>
        <Card gap={14}>
          <Field label="Position">
            <Row gap={8} wrap>
              {POSITIONS.map((p) => (
                <Chip key={p} label={p} selected={position === p} onPress={() => setPosition(p)} />
              ))}
            </Row>
            <Input value={position} onChangeText={setPosition} placeholder="Or type it" autoCapitalize="words" />
          </Field>
          <Field label="Joined">
            <DateInput value={startDate} onChange={setStartDate} />
          </Field>
          <Toggle label="I'm still on board" value={current} onChange={setCurrent} />
          {!current && (
            <Field label="Left">
              <DateInput value={endDate} onChange={setEndDate} />
            </Field>
          )}
          <Field label="Captain / master">
            <Input value={captain} onChangeText={setCaptain} placeholder="Optional" autoCapitalize="words" />
          </Field>
          <Field label="Management company">
            <Input value={company} onChangeText={setCompany} placeholder="Optional" autoCapitalize="words" />
          </Field>
        </Card>
        {error ? (
          <Txt size={13} weight={700} color="danger">
            {error}
          </Txt>
        ) : null}
        <Button label="Save" icon="check" iconStrokeWidth={2.4} height={58} onPress={onSave} />
        {e && <Button variant="ghost" label={armDelete ? 'Tap again to delete' : 'Delete position'} onPress={onDelete} />}
      </Sheet>
    </Screen>
  );
}
