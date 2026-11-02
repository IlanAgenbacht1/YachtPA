import { router } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Col, DateField, Display, Eyebrow, Field, Hero, HeroButton, isoDate, Row, Sheet, Spacer, Txt } from '@/components/ui';
import { addManualVoyage } from '@/db/repo';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

const num = (s: string) => Number(s.replace(',', '.'));

/** Add a voyage by hand: sea time from before the app, or a passage where GPS failed. */
export default function NewVoyage() {
  const { current, bump, flash } = useAppStore();
  const [date, setDate] = useState(isoDate(new Date()));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [nm, setNm] = useState('');
  const [hours, setHours] = useState('');
  const [night, setNight] = useState('');
  const [overnight, setOvernight] = useState(false);
  const [skipper, setSkipper] = useState(/captain|skipper|master/i.test(current?.engagement.position ?? ''));

  if (!current) return null;

  const onSave = async () => {
    const d = num(nm);
    const h = num(hours);
    const n = night.trim() ? num(night) : 0;
    if (!from.trim() || !to.trim()) return flash('From and to, please');
    if (!(d > 0) || !(h > 0)) return flash('Miles and hours underway, please');
    if (!(n >= 0) || n > h) return flash('Night hours cannot be more than hours underway');
    if (d / h > 40) return flash('That is over 40 kn on average. Check miles and hours.');
    if (date > isoDate(new Date())) return flash('That date is in the future');
    await addManualVoyage({ engagementId: current.engagement.id, date, from: from.trim(), to: to.trim(), distanceNm: d, underwayHours: h, nightHours: n, overnight, skipper });
    tick();
    bump();
    router.back();
    flash(`Voyage added · ${d} NM`);
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Add a voyage by hand</Eyebrow>
          <HeroButton icon="x" label="Close" />
        </Row>
        <Display size={32} color="heroFg">
          {current.vessel.name}
        </Display>
        <Txt size={14} color="heroMuted">
          For sea time before YachtPA, or a passage the GPS missed. Marked “Manual” on your record.
        </Txt>
      </Hero>
      <Sheet gap={16} paddingTop={24}>
        <Col gap={16}>
          <DateField label="Departure date" value={date} onChange={setDate} />
          <Row gap={10}>
            <Col flex={1}>
              <Field label="From" value={from} onChangeText={setFrom} autoCapitalize="words" />
            </Col>
            <Col flex={1}>
              <Field label="To" value={to} onChangeText={setTo} autoCapitalize="words" />
            </Col>
          </Row>
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Miles (NM)" value={nm} onChangeText={setNm} keyboardType="decimal-pad" />
            </Col>
            <Col flex={1}>
              <Field label="Hours underway" value={hours} onChangeText={setHours} keyboardType="decimal-pad" />
            </Col>
          </Row>
          <Field label="Night hours" value={night} onChangeText={setNight} keyboardType="decimal-pad" placeholder="0" />
          <Card gap={10} paddingV={12}>
            <Row gap={12}>
              <Txt size={15} weight={600} style={{ flex: 1 }}>
                Overnight passage
              </Txt>
              <Switch value={overnight} onValueChange={setOvernight} />
            </Row>
            <Row gap={12}>
              <Txt size={15} weight={600} style={{ flex: 1 }}>
                I was skipper
              </Txt>
              <Switch value={skipper} onValueChange={setSkipper} />
            </Row>
          </Card>
          <Txt size={12} color="muted">
            Use the logbook figures. Examiners check sea time closely, so only enter what you can back up.
          </Txt>
        </Col>
        <Spacer />
        <Button label="Add voyage" icon="check" iconStrokeWidth={2.4} onPress={onSave} />
      </Sheet>
    </Screen>
  );
}
