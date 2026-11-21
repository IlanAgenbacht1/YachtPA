import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Dictate } from '@/components/Dictate';
import { FadeUp, Rise } from '@/components/motion';
import { VoiceNote } from '@/components/VoiceNote';
import { Button, Card, Chip, Col, Eyebrow, Field, Icon, Input, Row, Segmented, Txt } from '@/components/ui';
import { draftFrom } from '@/domain/draft';
import { ACTIVITIES, isLocked, type Duty, type LogEntry, type Watch } from '@/domain/types';
import { tick } from '@/lib/haptics';
import { speechSupport } from '@/lib/speech';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

type Props = {
  engagementId: string;
  date: string;
  position: string;
  existing: LogEntry | null;
  /** Called after a save, with whether it was confirmed. */
  onSaved: (confirmed: boolean) => void;
};

const STATUS = { draft: 'Draft', confirmed: 'Saved', requested: 'Sent for sign-off', signed: 'Signed' } as const;

/**
 * Work → speak → confirm. Say (dictate) or type what you did, get a draft
 * that only splits and tidies your own words, fix anything, confirm.
 */
export function EntryEditor({ engagementId, date, position, existing, onSaved }: Props) {
  const { saveEntry, lastPlace, flash } = useAppStore();
  const locked = existing ? isLocked(existing.status) : false;

  const [mode, setMode] = useState<'speak' | 'edit' | 'view'>(existing ? 'view' : 'speak');
  const [transcript, setTranscript] = useState(existing?.transcript ?? '');
  const [voiceUri, setVoiceUri] = useState<string | null>(existing?.voiceUri ?? null);
  const [duties, setDuties] = useState<Duty[]>(existing?.duties ?? []);
  const [activities, setActivities] = useState<string[]>(existing?.activities ?? []);
  const [watches, setWatches] = useState<Watch[]>(existing?.watches ?? []);
  const [location, setLocation] = useState(existing?.location ?? lastPlace);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [fromDraft, setFromDraft] = useState(false);
  const canDictate = speechSupport().available;
  const [typing, setTyping] = useState(!canDictate);

  const toggle = (a: string) => setActivities((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]));

  const writeUp = (text = transcript) => {
    const d = draftFrom(text);
    setDuties(d.duties);
    setActivities((xs) => [...new Set([...xs, ...d.activities])]);
    setWatches(d.watches);
    if (d.passage && !location) setLocation(`${d.passage.from} → ${d.passage.to}`);
    setFromDraft(true);
    setMode('edit');
  };

  const save = async (confirm: boolean) => {
    try {
      await saveEntry({
        id: existing?.id,
        engagementId,
        date,
        location: location.trim(),
        activities,
        duties: duties.filter((d) => d.text.trim()).map((d) => ({ ...d, text: d.text.trim() })),
        watches: watches.filter((w) => /^\d{2}:\d{2}$/.test(w.start) && /^\d{2}:\d{2}$/.test(w.end)),
        notes: notes.trim(),
        voiceUri,
        transcript: transcript.trim(),
        status: confirm ? 'confirmed' : 'draft',
      });
      if (confirm) tick();
      onSaved(confirm);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  /* ---------- view a saved entry ---------- */
  if (mode === 'view' && existing) {
    return (
      <>
        <Rise>
          <Card gap={12}>
            <Row justify="space-between">
              <Eyebrow>{position} duties</Eyebrow>
              <Badge label={STATUS[existing.status]} color={existing.status === 'draft' ? 'brass' : 'ok'} />
            </Row>
            {existing.location ? (
              <Txt size={13} color="muted">
                {existing.location}
              </Txt>
            ) : null}
            {existing.duties.length === 0 && (
              <Txt size={14} color="muted">
                No duties written.
              </Txt>
            )}
            {existing.duties.map((d, i) => (
              <Row key={i} gap={10} align="flex-start">
                <View style={{ marginTop: 2 }}>
                  <Icon name="check" size={18} color="accent" strokeWidth={2.4} />
                </View>
                <Txt size={15} lh={20} style={{ flex: 1 }}>
                  {d.text}
                </Txt>
              </Row>
            ))}
            {existing.watches.map((w, i) => (
              <Txt key={`w${i}`} size={14} weight={600}>
                {w.type === 'night' ? 'Night' : w.type === 'anchor' ? 'Anchor' : 'Day'} watch {w.start}–{w.end}
              </Txt>
            ))}
          </Card>
        </Rise>
        {existing.activities.length > 0 && (
          <Row gap={8} wrap>
            {existing.activities.map((a) => (
              <Chip key={a} label={a} selected />
            ))}
          </Row>
        )}
        {locked ? (
          <Txt size={12} weight={600} color="muted">
            Sent for sign-off. This entry can no longer be edited.
          </Txt>
        ) : (
          <Button variant="ghost" label="Edit entry" onPress={() => setMode('edit')} />
        )}
      </>
    );
  }

  /* ---------- say it ---------- */
  if (mode === 'speak') {
    const ticks = (
      <FadeUp delay={140}>
        <Col gap={10}>
          <Eyebrow>Or tick what you did</Eyebrow>
          <Row gap={8} wrap>
            {ACTIVITIES.map((a) => (
              <Chip key={a} label={a} selected={activities.includes(a)} onPress={() => toggle(a)} />
            ))}
          </Row>
          {activities.length > 0 && <Button variant="ghost" label={`Continue with ${activities.length} ticked`} onPress={() => setMode('edit')} />}
        </Col>
      </FadeUp>
    );

    if (!typing) {
      return (
        <>
          <Dictate
            onDone={(text, uri) => {
              setTranscript(text);
              if (uri) setVoiceUri(uri);
              writeUp(text);
            }}
            onType={() => setTyping(true)}
          />
          {ticks}
        </>
      );
    }

    return (
      <>
        <FadeUp>
          <Card gap={12}>
            <Col gap={2}>
              <Txt size={17} weight={700}>
                What did you do today?
              </Txt>
              {!canDictate && (
                <Txt size={12} color="muted">
                  Speech-to-text needs the full app build (not Expo Go). Record a voice note and type the gist.
                </Txt>
              )}
            </Col>
            <Input
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Washed down the exterior, checked the tender, night watch from 9 to 11…"
              multiline
              minHeight={130}
              accessibilityLabel="What you did today"
            />
            <Button label="Write it up" icon="check" iconStrokeWidth={2.4} height={56} onPress={() => (transcript.trim() ? writeUp() : setMode('edit'))} />
            {canDictate && (
              <Pressable onPress={() => setTyping(false)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
                <Txt size={13} weight={700} color="accent">
                  Speak instead
                </Txt>
              </Pressable>
            )}
          </Card>
        </FadeUp>
        {!canDictate && (
          <FadeUp delay={80}>
            <VoiceNote uri={voiceUri} onChange={setVoiceUri} />
          </FadeUp>
        )}
        {ticks}
      </>
    );
  }

  /* ---------- edit and confirm ---------- */
  return (
    <>
      <Rise>
        <Card gap={12}>
          <Row justify="space-between">
            <Eyebrow>{position} duties</Eyebrow>
            <Badge label={fromDraft ? 'Draft from your words' : 'Editing'} color="brass" />
          </Row>
          {duties.map((d, i) => (
            <Row key={i} gap={8} align="flex-start">
              <View style={{ flex: 1 }}>
                <Input value={d.text} onChangeText={(s) => setDuties((xs) => xs.map((x, j) => (j === i ? { ...x, text: s } : x)))} placeholder="Duty" minHeight={46} />
              </View>
              <IconButton icon="x" label="Remove duty" onPress={() => setDuties((xs) => xs.filter((_, j) => j !== i))} />
            </Row>
          ))}
          <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a duty" height={46} onPress={() => setDuties((xs) => [...xs, { text: '' }])} />
        </Card>
      </Rise>

      <Col gap={10}>
        <Eyebrow>Activities</Eyebrow>
        <Row gap={8} wrap>
          {ACTIVITIES.map((a) => (
            <Chip key={a} label={a} selected={activities.includes(a)} onPress={() => toggle(a)} />
          ))}
        </Row>
      </Col>

      <Card gap={12}>
        <Eyebrow>Watches</Eyebrow>
        {watches.map((w, i) => (
          <Col key={i} gap={8}>
            <Segmented
              value={w.type}
              options={[
                { value: 'night', label: 'Night' },
                { value: 'day', label: 'Day' },
                { value: 'anchor', label: 'Anchor' },
              ]}
              onChange={(type) => setWatches((xs) => xs.map((x, j) => (j === i ? { ...x, type } : x)))}
            />
            <Row gap={8}>
              <View style={{ flex: 1 }}>
                <Input value={w.start} onChangeText={(s) => setWatches((xs) => xs.map((x, j) => (j === i ? { ...x, start: s } : x)))} placeholder="21:00" keyboardType="numbers-and-punctuation" />
              </View>
              <Txt size={15} weight={700} color="muted">
                to
              </Txt>
              <View style={{ flex: 1 }}>
                <Input value={w.end} onChangeText={(s) => setWatches((xs) => xs.map((x, j) => (j === i ? { ...x, end: s } : x)))} placeholder="23:00" keyboardType="numbers-and-punctuation" />
              </View>
              <IconButton icon="x" label="Remove watch" onPress={() => setWatches((xs) => xs.filter((_, j) => j !== i))} />
            </Row>
          </Col>
        ))}
        <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Add a watch" height={46} onPress={() => setWatches((xs) => [...xs, { type: 'night', start: '', end: '' }])} />
      </Card>

      <Card gap={14}>
        <Field label="Location">
          <Input value={location} onChangeText={setLocation} placeholder="Port Louis, Mauritius" autoCapitalize="words" />
        </Field>
        <Field label="Notes">
          <Input value={notes} onChangeText={setNotes} placeholder="Optional" multiline minHeight={70} />
        </Field>
        {transcript ? (
          <Field label="What you said">
            <Txt size={13} lh={19} color="muted">
              {transcript}
            </Txt>
          </Field>
        ) : null}
      </Card>

      <Txt size={12} weight={600} color="muted">
        Nothing added that you did not say. It stays a draft until you confirm.
      </Txt>
      <Button label="Confirm and save" icon="check" iconStrokeWidth={2.4} height={62} onPress={() => save(true)} />
      <Button variant="ghost" label="Save as draft" onPress={() => save(false)} />
      {!existing && (
        <Pressable onPress={() => setMode('speak')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Txt size={13} weight={700} color="muted">
            Start again
          </Txt>
        </Pressable>
      )}
    </>
  );
}

function Badge({ label, color }: { label: string; color: 'ok' | 'brass' }) {
  const t = useTokens();
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, borderWidth: 1, borderColor: t.colors[color] }}>
      <Eyebrow size={10} ls={1.2} color={color}>
        {label}
      </Eyebrow>
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: 'x'; label: string; onPress: () => void }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.cardBorder, backgroundColor: t.colors.card }}>
      <Icon name={icon} size={18} color="muted" />
    </Pressable>
  );
}
