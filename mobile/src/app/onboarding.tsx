import { Redirect } from 'expo-router';
import { useState } from 'react';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Col, DateField, Display, Eyebrow, Field, Hero, isoDate, Segmented, Sheet, Spacer, Txt } from '@/components/ui';
import type { Propulsion } from '@/db/repo';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

/** First launch: who you are and which yacht you are on. Three things, then you are in. */
export default function Onboarding() {
  const { current, onboard, flash } = useAppStore();
  const [name, setName] = useState('');
  const [vessel, setVessel] = useState('');
  const [position, setPosition] = useState('');
  const [propulsion, setPropulsion] = useState<Propulsion>('motor');
  const [loa, setLoa] = useState('');
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [busy, setBusy] = useState(false);

  if (current) return <Redirect href="/" />;

  const onDone = async () => {
    if (!name.trim() || !vessel.trim() || !position.trim()) {
      flash('Name, yacht and position, please');
      return;
    }
    const loaM = loa.trim() ? Number(loa.replace(',', '.')) : null;
    if (loaM !== null && !(loaM > 0 && loaM < 200)) {
      flash('Length looks wrong. Metres, e.g. 42');
      return;
    }
    setBusy(true);
    try {
      await onboard({ name: name.trim(), vesselName: vessel.trim(), position: position.trim(), propulsion, loaM, startDate });
      tick();
    } catch (e) {
      flash((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Welcome aboard</Eyebrow>
        <Display size={36} color="heroFg">
          Your sea time, logged for you
        </Display>
        <Txt size={14} color="heroMuted">
          Everything stays on this iPhone.
        </Txt>
      </Hero>
      <Sheet gap={16} paddingTop={24}>
        <FadeUp>
          <Col gap={16}>
            <Field label="Your name" value={name} onChangeText={setName} placeholder="Full name" textContentType="name" autoComplete="name" />
            <Field label="Current yacht" value={vessel} onChangeText={setVessel} placeholder="M/Y Shadow" autoCapitalize="words" />
            <Field label="Position on board" value={position} onChangeText={setPosition} placeholder="Deckhand" autoCapitalize="words" />
            <Segmented
              label="Vessel type"
              value={propulsion}
              onChange={setPropulsion}
              options={[
                { value: 'motor', label: 'Motor' },
                { value: 'sail', label: 'Sail' },
              ]}
            />
            <Field label="Length overall (m)" value={loa} onChangeText={setLoa} placeholder="Optional" keyboardType="decimal-pad" />
            <DateField label="Joined on" value={startDate} onChange={setStartDate} />
          </Col>
        </FadeUp>
        <Spacer />
        <Button label={busy ? 'Saving…' : 'Get started'} icon="check" iconStrokeWidth={2.4} onPress={busy ? () => {} : onDone} />
      </Sheet>
    </Screen>
  );
}
