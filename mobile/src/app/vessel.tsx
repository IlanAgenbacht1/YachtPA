import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Field, Input, num, Row, Segmented, Sheet, Txt } from '@/components/ui';
import type { Propulsion } from '@/domain/types';
import { useAppStore } from '@/store/AppStore';

export default function VesselScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const s = useAppStore();
  const v = s.vessels.find((x) => x.id === id) ?? null;
  const [name, setName] = useState(v?.name ?? '');
  const [propulsion, setPropulsion] = useState<Propulsion>(v?.propulsion ?? 'motor');
  const [loa, setLoa] = useState(v?.loaM?.toString() ?? '');
  const [gt, setGt] = useState(v?.gt?.toString() ?? '');
  const [category, setCategory] = useState(v?.category ?? '');
  const [flag, setFlag] = useState(v?.flag ?? '');
  const [homePort, setHomePort] = useState(v?.homePort ?? '');
  const [imo, setImo] = useState(v?.imo ?? '');
  const [official, setOfficial] = useState(v?.officialNumber ?? '');
  const [more, setMore] = useState(!!v);
  const [error, setError] = useState('');
  const [armDelete, setArmDelete] = useState(false);

  const onSave = async () => {
    if (!name.trim()) return setError('Name the yacht, e.g. "M/Y Shadow".');
    const loaM = num(loa);
    if (loa && (loaM === null || loaM <= 0 || loaM > 200)) return setError('Length should be in metres, e.g. 27.4.');
    const gtN = num(gt);
    if (gt && (gtN === null || gtN <= 0)) return setError('Gross tonnage should be a number.');
    const newId = await s.saveVessel({
      id: v?.id,
      createdAt: v?.createdAt,
      name: name.trim(),
      propulsion,
      loaM,
      gt: gtN,
      category: category.trim(),
      flag: flag.trim(),
      homePort: homePort.trim(),
      imo: imo.trim(),
      officialNumber: official.trim(),
    });
    if (!v && !s.engagements.some((e) => e.vesselId === newId)) router.replace({ pathname: '/engagement', params: { vesselId: newId } });
    else router.back();
  };

  const onDelete = async () => {
    if (!v) return;
    if (!armDelete) return setArmDelete(true);
    const ok = await s.deleteVessel(v.id);
    if (!ok) return setError('This yacht has positions on it. Remove those first.');
    router.back();
  };

  return (
    <Screen>
      <BackHero eyebrow={v ? 'Edit yacht' : 'Add a yacht'} title={v?.name || 'New yacht'} />
      <Sheet gap={14} paddingBottom={32}>
        <Card gap={14}>
          <Field label="Name">
            <Input value={name} onChangeText={setName} placeholder="M/Y Shadow" autoCapitalize="words" />
          </Field>
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
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Length (m)">
                <Input value={loa} onChangeText={setLoa} placeholder="27.4" keyboardType="decimal-pad" />
              </Field>
            </Col>
            <Col flex={1}>
              <Field label="Gross tonnage">
                <Input value={gt} onChangeText={setGt} placeholder="Optional" keyboardType="decimal-pad" />
              </Field>
            </Col>
          </Row>
          {!more && <Button variant="ghost" label="More details" onPress={() => setMore(true)} />}
          {more && (
            <>
              <Field label="Kind of yacht">
                <Input value={category} onChangeText={setCategory} placeholder="Private, charter, chase boat…" />
              </Field>
              <Field label="Flag">
                <Input value={flag} onChangeText={setFlag} placeholder="Cayman Islands" autoCapitalize="words" />
              </Field>
              <Field label="Home port">
                <Input value={homePort} onChangeText={setHomePort} placeholder="Port Louis" autoCapitalize="words" />
              </Field>
              <Row gap={10}>
                <Col flex={1}>
                  <Field label="IMO">
                    <Input value={imo} onChangeText={setImo} placeholder="If any" keyboardType="number-pad" />
                  </Field>
                </Col>
                <Col flex={1}>
                  <Field label="Official no.">
                    <Input value={official} onChangeText={setOfficial} placeholder="If any" />
                  </Field>
                </Col>
              </Row>
            </>
          )}
        </Card>
        {error ? (
          <Txt size={13} weight={700} color="danger">
            {error}
          </Txt>
        ) : null}
        <Button label={v ? 'Save' : 'Next'} icon="check" iconStrokeWidth={2.4} height={58} onPress={onSave} />
        {v && <Button variant="ghost" label={armDelete ? 'Tap again to delete' : 'Delete yacht'} onPress={onDelete} />}
      </Sheet>
    </Screen>
  );
}
