import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, Chip, Col, DateField, Display, Eyebrow, Field, Hero, HeroButton, isoDate, Row, Segmented, Sheet, Spacer } from '@/components/ui';
import { deleteDoc, getDoc, saveDoc } from '@/db/repo';
import { tick } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';

const COMMON = ['STCW Basic Safety', 'ENG1 Medical', 'Passport', 'VHF SRC', 'Powerboat Level 2', 'Yachtmaster Offshore', 'Seaman’s book', 'Schengen visa'];

/** Add or edit one document. Opened with `?id=` to edit. */
export default function DocumentEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { bump, flash } = useAppStore();
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [number, setNumber] = useState('');
  const [hasExpiry, setHasExpiry] = useState<'yes' | 'no'>('yes');
  const [expires, setExpires] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return isoDate(d);
  });

  useEffect(() => {
    if (!id) return;
    getDoc(id).then((d) => {
      if (!d) return;
      setName(d.name);
      setIssuer(d.issuer ?? '');
      setNumber(d.number ?? '');
      setHasExpiry(d.expires ? 'yes' : 'no');
      if (d.expires) setExpires(d.expires);
    });
  }, [id]);

  const onSave = async () => {
    if (!name.trim()) {
      flash('Give it a name');
      return;
    }
    if (hasExpiry === 'yes' && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
      flash('Expiry date as YYYY-MM-DD');
      return;
    }
    await saveDoc({ id, name: name.trim(), issuer: issuer.trim() || null, number: number.trim() || null, expires: hasExpiry === 'yes' ? expires : null });
    tick();
    bump();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(`Delete ${name}?`, undefined, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(id);
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
          <Eyebrow color="heroMuted">Documents</Eyebrow>
          <HeroButton icon="x" label="Close" />
        </Row>
        <Display size={34} color="heroFg" numberOfLines={2}>
          {id ? name || 'Document' : 'Add a document'}
        </Display>
      </Hero>
      <Sheet gap={16} paddingTop={24}>
        {!id && (
          <Row gap={8} wrap>
            {COMMON.map((c) => (
              <Chip key={c} label={c} selected={name === c} onPress={() => setName(c)} />
            ))}
          </Row>
        )}
        <Col gap={16}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="STCW Basic Safety" autoCapitalize="words" />
          <Field label="Issued by" value={issuer} onChangeText={setIssuer} placeholder="MCA, RYA, country…" autoCapitalize="words" />
          <Field label="Number" value={number} onChangeText={setNumber} placeholder="Optional" autoCapitalize="characters" />
          <Segmented
            label="Expiry"
            value={hasExpiry}
            onChange={setHasExpiry}
            options={[
              { value: 'yes', label: 'Expires' },
              { value: 'no', label: 'No expiry' },
            ]}
          />
          {hasExpiry === 'yes' && <DateField label="Expires on" value={expires} onChange={setExpires} />}
        </Col>
        <Spacer />
        <Button label="Save" icon="check" iconStrokeWidth={2.4} onPress={onSave} />
        {id && <Button variant="ghost" label="Delete" onPress={onDelete} />}
      </Sheet>
    </Screen>
  );
}
