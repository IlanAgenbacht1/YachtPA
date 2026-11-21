import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, DateInput, Display, Eyebrow, Field, Hero, Icon, Input, num, Row, Segmented, Sheet, Txt } from '@/components/ui';
import { isDayKey } from '@/domain/dates';
import type { Propulsion } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';

const POSITIONS = ['Deckhand', 'Bosun', 'Mate', 'Chief officer', 'Captain', 'Engineer'];

/** Three steps: you, your yacht, why location. Then straight to Home. */
export default function OnboardingScreen() {
  const s = useAppStore();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState(s.profile.name);
  const [nationality, setNationality] = useState(s.profile.nationality);
  const [vesselName, setVesselName] = useState('');
  const [propulsion, setPropulsion] = useState<Propulsion>('motor');
  const [loa, setLoa] = useState('');
  const [position, setPosition] = useState('');
  const [joined, setJoined] = useState(s.today);
  const [error, setError] = useState('');

  const next0 = async () => {
    if (!name.trim()) return setError('What should we call you?');
    setError('');
    await s.saveProfile({ ...s.profile, name: name.trim(), nationality: nationality.trim() });
    setStep(s.engagements.length ? 2 : 1);
  };

  const next1 = async (skip = false) => {
    if (!skip) {
      if (!vesselName.trim()) return setError('Name the yacht, e.g. "M/Y Shadow".');
      if (!position.trim()) return setError('Pick your position.');
      if (!isDayKey(joined)) return setError('Joined date must be YYYY-MM-DD.');
      const vesselId = await s.saveVessel({
        name: vesselName.trim(),
        propulsion,
        loaM: num(loa),
        gt: null,
        category: '',
        flag: '',
        homePort: '',
        imo: '',
        officialNumber: '',
      });
      await s.saveEngagement({ vesselId, position: position.trim(), startDate: joined, endDate: null, captain: '', company: '' });
    }
    setError('');
    setStep(2);
  };

  const finish = async () => {
    await s.finishOnboarding();
    router.replace('/');
  };

  const titles = ['Welcome aboard', 'Your current yacht', 'Location, only when you say'];

  return (
    <Screen>
      <Hero gap={10} compass>
        <Eyebrow color="heroMuted">Step {step + 1} of 3</Eyebrow>
        <Display size={36} color="heroFg">
          {titles[step]}
        </Display>
        <Txt size={14} color="heroMuted">
          Work → speak → confirm. Under two minutes a day.
        </Txt>
      </Hero>

      <Sheet gap={14} paddingBottom={32}>
        {step === 0 && (
          <Card gap={14}>
            <Field label="Your name">
              <Input value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" autoFocus />
            </Field>
            <Field label="Nationality">
              <Input value={nationality} onChangeText={setNationality} placeholder="Optional" autoCapitalize="words" />
            </Field>
            <Txt size={12} color="muted">
              Everything stays on this phone. Cloud backup arrives in a later version; you can export your whole record any time.
            </Txt>
          </Card>
        )}

        {step === 1 && (
          <Card gap={14}>
            <Field label="Yacht name">
              <Input value={vesselName} onChangeText={setVesselName} placeholder="M/Y Shadow" autoCapitalize="words" />
            </Field>
            <Row gap={10}>
              <Col flex={1}>
                <Field label="Type">
                  <Segmented
                    value={propulsion}
                    options={[
                      { value: 'motor', label: 'Motor' },
                      { value: 'sail', label: 'Sail' },
                    ]}
                    onChange={setPropulsion}
                  />
                </Field>
              </Col>
              <Col flex={1}>
                <Field label="Length (m)">
                  <Input value={loa} onChangeText={setLoa} placeholder="27.4" keyboardType="decimal-pad" />
                </Field>
              </Col>
            </Row>
            <Field label="Your position">
              <Row gap={8} wrap>
                {POSITIONS.map((p) => (
                  <Chip key={p} label={p} selected={position === p} onPress={() => setPosition(p)} />
                ))}
              </Row>
              <Input value={position} onChangeText={setPosition} placeholder="Or type it" autoCapitalize="words" />
            </Field>
            <Field label="Joined">
              <DateInput value={joined} onChange={setJoined} />
            </Field>
          </Card>
        )}

        {step === 2 && (
          <Card gap={14}>
            {[
              ['send', 'You press START VOYAGE and STOP VOYAGE. Location is only used in between.'],
              ['compass', 'Miles, hours and night time are worked out from the track automatically.'],
              [
                'alert',
                Platform.OS === 'ios'
                  ? 'Choose "Always allow" when asked, so tracking carries on with the screen off.'
                  : 'Choose "Allow all the time" when asked, so tracking carries on with the screen off.',
              ],
            ].map(([icon, text]) => (
              <Row key={text} gap={12} align="flex-start">
                <Icon name={icon as 'send'} size={20} color="accent" />
                <Txt size={15} lh={21} style={{ flex: 1 }}>
                  {text}
                </Txt>
              </Row>
            ))}
            <Txt size={12} color="muted">
              You can turn location off in your phone’s settings at any time. Nothing is tracked unless a voyage is running.
            </Txt>
          </Card>
        )}

        {error ? (
          <Txt size={13} weight={700} color="danger">
            {error}
          </Txt>
        ) : null}

        {step === 0 && <Button label="Next" icon="check" iconStrokeWidth={2.4} onPress={next0} />}
        {step === 1 && (
          <>
            <Button label="Next" icon="check" iconStrokeWidth={2.4} onPress={() => next1()} />
            <Button variant="ghost" label="Skip for now" onPress={() => next1(true)} />
          </>
        )}
        {step === 2 && <Button label="Done" icon="check" iconStrokeWidth={2.4} onPress={finish} />}
      </Sheet>
    </Screen>
  );
}
