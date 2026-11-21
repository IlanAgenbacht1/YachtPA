import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, DateInput, Eyebrow, Field, Icon, Input, Row, Sheet, Txt } from '@/components/ui';
import { isDayKey } from '@/domain/dates';
import { DOC_TYPES, docStatus, history, remainingLabel } from '@/domain/documents';
import type { DocType } from '@/domain/types';
import { fmtDay } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';

/** Copies a picked file into the app's documents folder so it outlives the picker's cache. */
async function keepFile(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'docs');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, `${Date.now()}-${name.replace(/[^\w.-]/g, '_')}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/** Add, view, edit or renew one document. `?id=` edits, `&renew=1` adds a renewed copy. */
export default function DocumentScreen() {
  const { id, renew } = useLocalSearchParams<{ id?: string; renew?: string }>();
  const s = useAppStore();
  const existing = s.docs.find((d) => d.id === id) ?? null;
  const renewing = !!existing && renew === '1';

  const [type, setType] = useState<DocType>(existing?.type ?? 'stcw');
  const [name, setName] = useState(existing?.name ?? '');
  const [issuer, setIssuer] = useState(existing?.issuer ?? '');
  const [number, setNumber] = useState(renewing ? '' : (existing?.number ?? ''));
  const [issueDate, setIssueDate] = useState(renewing ? '' : (existing?.issueDate ?? ''));
  const [expiryDate, setExpiryDate] = useState(renewing ? '' : (existing?.expiryDate ?? ''));
  const [file, setFile] = useState<{ uri: string; mime: string | null } | null>(
    !renewing && existing?.fileUri ? { uri: existing.fileUri, mime: existing.fileMime } : null,
  );
  const [error, setError] = useState('');
  const [armDelete, setArmDelete] = useState(false);

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setError('Camera permission is off.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets[0]) setFile({ uri: await keepFile(r.assets[0].uri, r.assets[0].fileName ?? 'photo.jpg'), mime: r.assets[0].mimeType ?? 'image/jpeg' });
  };
  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled && r.assets[0]) setFile({ uri: await keepFile(r.assets[0].uri, r.assets[0].fileName ?? 'photo.jpg'), mime: r.assets[0].mimeType ?? 'image/jpeg' });
  };
  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets[0]) setFile({ uri: await keepFile(r.assets[0].uri, r.assets[0].name), mime: r.assets[0].mimeType ?? null });
  };
  const openFile = async () => {
    if (!file) return;
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(file.uri, { mimeType: file.mime ?? undefined });
    else Linking.openURL(file.uri);
  };

  const onSave = async () => {
    if (!name.trim()) return setError('Give it a name, e.g. "STCW Basic Safety".');
    if (issueDate && !isDayKey(issueDate)) return setError('Issue date must be YYYY-MM-DD.');
    if (expiryDate && !isDayKey(expiryDate)) return setError('Expiry date must be YYYY-MM-DD, or leave it empty for no expiry.');
    const d = {
      type,
      name: name.trim(),
      issuer: issuer.trim(),
      number: number.trim(),
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      fileUri: file?.uri ?? null,
      fileMime: file?.mime ?? null,
    };
    if (renewing && existing) {
      await s.renewDoc(existing.id, d);
      s.flash(`${d.name} updated ✓`);
    } else {
      await s.saveDoc({ ...d, id: existing?.id, createdAt: existing?.createdAt, supersededBy: existing?.supersededBy ?? null });
      s.flash(existing ? 'Saved' : `${d.name} added`);
    }
    router.back();
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!armDelete) return setArmDelete(true);
    await s.deleteDoc(existing.id);
    s.flash('Deleted');
    router.back();
  };

  const older = existing && !renewing ? history(existing, s.docs) : [];
  const st = existing && !renewing ? docStatus(existing, s.today) : null;

  return (
    <Screen>
      <BackHero
        eyebrow={renewing ? 'Renewed copy' : existing ? 'Document' : 'Add a document'}
        title={existing ? existing.name : 'New document'}
        subtitle={existing && !renewing ? (existing.expiryDate ? `Expires ${fmtDay(existing.expiryDate)} · ${remainingLabel(existing, s.today)}` : 'No expiry') : undefined}
      />
      <Sheet gap={14} paddingBottom={32}>
        {st && st !== 'ok' && (
          <Card row gap={10} paddingV={12} borderColor={st}>
            <Icon name="alert" size={18} color={st} />
            <Txt size={14} weight={600} style={{ flex: 1 }}>
              {remainingLabel(existing!, s.today) === 'Expired' ? 'Expired.' : `Expires in ${remainingLabel(existing!, s.today)}.`} Add the renewed one when you have it.
            </Txt>
          </Card>
        )}
        {existing && !renewing && (
          <Button label="Add renewed copy" icon="plus" iconStrokeWidth={2} height={56} onPress={() => router.replace({ pathname: '/document', params: { id: existing.id, renew: '1' } })} />
        )}

        <Card gap={14}>
          <Field label="Type">
            <Row gap={8} wrap>
              {DOC_TYPES.map((d) => (
                <Chip key={d.type} label={d.label} selected={type === d.type} onPress={() => setType(d.type)} />
              ))}
            </Row>
          </Field>
          <Field label="Name">
            <Input value={name} onChangeText={setName} placeholder="STCW Basic Safety" autoCapitalize="words" />
          </Field>
          <Field label="Issued by">
            <Input value={issuer} onChangeText={setIssuer} placeholder="MCA, RYA, country…" autoCapitalize="words" />
          </Field>
          <Field label="Number">
            <Input value={number} onChangeText={setNumber} placeholder="Optional" autoCapitalize="characters" />
          </Field>
          <Row gap={10}>
            <Col flex={1}>
              <Field label="Issued">
                <DateInput value={issueDate} onChange={setIssueDate} allowEmpty />
              </Field>
            </Col>
            <Col flex={1}>
              <Field label="Expires" hint="Empty = no expiry">
                <DateInput value={expiryDate} onChange={setExpiryDate} allowEmpty />
              </Field>
            </Col>
          </Row>
        </Card>

        <Card gap={10}>
          <Eyebrow>Copy of the document</Eyebrow>
          {file ? (
            <Col gap={10}>
              {file.mime?.startsWith('image/') ? (
                <Image source={{ uri: file.uri }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" accessibilityLabel="Document photo" />
              ) : (
                <Row gap={8}>
                  <Icon name="file" size={18} color="muted" />
                  <Txt size={14} weight={600}>
                    File attached
                  </Txt>
                </Row>
              )}
              <Row gap={8}>
                <View style={{ flex: 1 }}>
                  <Button variant="ghost" label="Open" onPress={openFile} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="ghost" label="Remove" onPress={() => setFile(null)} />
                </View>
              </Row>
            </Col>
          ) : (
            <Row gap={8}>
              {Platform.OS !== 'web' && (
                <View style={{ flex: 1 }}>
                  <Button variant="ghost" label="Camera" onPress={pickCamera} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button variant="ghost" label="Photo" onPress={pickPhoto} />
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="ghost" label="PDF" onPress={pickPdf} />
              </View>
            </Row>
          )}
        </Card>

        {error ? (
          <Txt size={13} weight={700} color="danger">
            {error}
          </Txt>
        ) : null}
        <Button label={renewing ? 'Save renewed copy' : 'Save'} icon="check" iconStrokeWidth={2.4} height={58} onPress={onSave} />

        {older.length > 0 && (
          <Col gap={8}>
            <Eyebrow>History</Eyebrow>
            {older.map((d) => (
              <Card key={d.id} row gap={10} paddingV={12}>
                <Col flex={1} gap={2}>
                  <Txt size={14} weight={600}>
                    {d.name}
                  </Txt>
                  <Txt size={12} color="muted">
                    {d.expiryDate ? `Expired ${fmtDay(d.expiryDate)}` : 'No expiry'} · replaced
                  </Txt>
                </Col>
              </Card>
            ))}
          </Col>
        )}
        {existing && !renewing && <Button variant="ghost" label={armDelete ? 'Tap again to delete' : 'Delete document'} onPress={onDelete} />}
      </Sheet>
    </Screen>
  );
}
