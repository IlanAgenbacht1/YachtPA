import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Screen } from '@/components/Screen';
import { Button, Col, DateField, Display, Eyebrow, Field, Hero, HeroButton, isoDate, Row, Segmented, Sheet, Spacer, Txt } from '@/components/ui';
import { changeVessel, updateCurrent, type Propulsion } from '@/db/repo';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

const num = (s: string): number | null => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Edit the current yacht and position, or (`?mode=new`) record a move to a
 * new yacht: the current engagement ends and a new one starts. Past voyages
 * and log entries stay with the yacht they happened on.
 */
export default function VesselScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isNew = mode === 'new';
  const { current, refresh, flash, voyage } = useAppStore();
  const c = current;

  const [name, setName] = useState(isNew ? '' : (c?.profile.name ?? ''));
  const [nationality, setNationality] = useState(c?.profile.nationality ?? '');
  const [vesselName, setVesselName] = useState(isNew ? '' : (c?.vessel.name ?? ''));
  const [propulsion, setPropulsion] = useState<Propulsion>(isNew ? 'motor' : (c?.vessel.propulsion ?? 'motor'));
  const [loa, setLoa] = useState(isNew || !c?.vessel.loaM ? '' : String(c.vessel.loaM));
  const [gt, setGt] = useState(isNew || !c?.vessel.gt ? '' : String(c.vessel.gt));
  const [flag, setFlag] = useState(isNew ? '' : (c?.vessel.flag ?? ''));
  const [position, setPosition] = useState(c?.engagement.position ?? '');
  const [startDate, setStartDate] = useState(isNew ? isoDate(new Date()) : (c?.engagement.startDate ?? isoDate(new Date())));
  const [captain, setCaptain] = useState(isNew ? '' : (c?.engagement.captain ?? ''));
  const [company, setCompany] = useState(isNew ? '' : (c?.engagement.company ?? ''));

  if (!c) return null;

  const onSave = async () => {
    if (!vesselName.trim() || !position.trim() || (!isNew && !name.trim())) {
      flash('Yacht and position, please');
      return;
    }
    if (isNew && voyage) {
      flash('Stop the live voyage first');
      return;
    }
    if (isNew) {
      await changeVessel({ vesselName: vesselName.trim(), propulsion, loaM: num(loa), position: position.trim(), startDate });
    } else {
      await updateCurrent({
        profile: { name: name.trim(), nationality: nationality.trim() || null },
        vessel: { ...c.vessel, name: vesselName.trim(), propulsion, loaM: num(loa), gt: num(gt), flag: flag.trim() || null },
        engagement: { ...c.engagement, position: position.trim(), startDate, captain: captain.trim() || null, company: company.trim() || null },
      });
    }
    tick();
    await refresh();
    router.back();
    flash(isNew ? `Welcome aboard ${vesselName.trim()}` : 'Saved');
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">{isNew ? 'New yacht' : 'Vessel and position'}</Eyebrow>
          <HeroButton />
        </Row>
        <Display size={34} color="heroFg" numberOfLines={2}>
          {isNew ? 'Where are you now?' : c.vessel.name}
        </Display>
        {isNew && (
          <Txt size={14} color="heroMuted">
            Your time on {c.vessel.name} ends the day you join.
          </Txt>
        )}
      </Hero>
      <Sheet gap={16} paddingTop={24}>
        <Col gap={16}>
          {!isNew && <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" />}
          {!isNew && <Field label="Nationality" value={nationality} onChangeText={setNationality} placeholder="Optional" autoCapitalize="words" />}
          <Field label="Yacht" value={vesselName} onChangeText={setVesselName} placeholder="M/Y Shadow" autoCapitalize="words" />
          <Field label="Position" value={position} onChangeText={setPosition} placeholder="Deckhand" autoCapitalize="words" />
          <Segmented
            label="Vessel type"
            value={propulsion}
            onChange={setPropulsion}
            options={[
              { value: 'motor', label: 'Motor' },
              { value: 'sail', label: 'Sail' },
            ]}
          />
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Length (m)" value={loa} onChangeText={setLoa} keyboardType="decimal-pad" placeholder="Optional" />
            </Col>
            {!isNew && (
              <Col flex={1}>
                <Field label="Gross tonnage" value={gt} onChangeText={setGt} keyboardType="decimal-pad" placeholder="Optional" />
              </Col>
            )}
          </Row>
          {!isNew && <Field label="Flag" value={flag} onChangeText={setFlag} placeholder="Optional" autoCapitalize="words" />}
          <DateField label={isNew ? 'Joined on' : 'On board since'} value={startDate} onChange={setStartDate} />
          {!isNew && <Field label="Captain" value={captain} onChangeText={setCaptain} placeholder="Optional" autoCapitalize="words" />}
          {!isNew && <Field label="Management company" value={company} onChangeText={setCompany} placeholder="Optional" autoCapitalize="words" />}
        </Col>
        <Spacer />
        <Button label={isNew ? 'Join yacht' : 'Save'} icon="check" iconStrokeWidth={2.4} onPress={onSave} />
      </Sheet>
    </Screen>
  );
}
