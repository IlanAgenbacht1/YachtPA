import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, Display, Eyebrow, Field, Hero, Icon, Row, Sheet, Txt } from '@/components/ui';
import { getLog, getSetting, listLogs, listVoyages, localDate, saveLog, setSetting, type LogEntry, type Voyage } from '@/db/repo';
import { Dictate } from '@/components/Dictate';
import { Contain } from '@/components/ErrorScreen';
import { draftFromText } from '@/domain/draft';
import { log } from '@/lib/diag';
import { track } from '@/telemetry';
import { markSpeechBroken, speechSupport } from '@/lib/speech';
import { ACTIVITIES } from '@/lib/constants';
import { fmtDur, fmtInt, fmtIsoShort } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { useAppStore, useQuery } from '@/store/AppStore';
import { useTokens } from '@/theme';

const DRAFT_KEY = 'log_draft';
type Draft = { engagementId: string; date: string; text: string; activities: string[] };
function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    return typeof d?.text === 'string' && Array.isArray(d.activities) ? d : null;
  } catch {
    return null;
  }
}

/**
 * One entry per day per yacht: what you did and what kind of work it was.
 * Tap the big mic and speak (in-app speech recognition, offline where the
 * phone supports it); what you said becomes the draft: one duty per line and
 * activity ticks. Edit, confirm. Where the mic is not available (Expo Go,
 * the browser) it is typing plus the keyboard's own mic. Below, the diary.
 */
export default function LogScreen() {
  const t = useTokens();
  const { current, bump, flash, micOn } = useAppStore();
  const today = localDate();
  const [date, setDate] = useState(today);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<LogEntry | null>(null);

  const engagementId = current?.engagement.id;
  const logs = useQuery(listLogs);
  const voyages = useQuery(() => listVoyages(400));

  // Load the entry for the selected day.
  useEffect(() => {
    if (!engagementId) return;
    let live = true;
    Promise.all([getLog(engagementId, date), getSetting(DRAFT_KEY).catch(() => null)]).then(([e, raw]) => {
      if (!live) return;
      setSaved(e);
      // An unsaved draft for this day (the phone closed the app before Save) wins over the saved entry.
      const d = parseDraft(raw);
      const mine = d && d.engagementId === engagementId && d.date === date ? d : null;
      setText(mine ? mine.text : e ? e.duties.join('\n') : '');
      setChosen(new Set(mine ? mine.activities : (e?.activities ?? [])));
      loadedFor.current = `${engagementId}|${date}`;
    });
    return () => {
      live = false;
    };
  }, [engagementId, date]);

  const dayVoyages = (voyages ?? []).filter((v) => localDate(new Date(v.startedAt)) === date);
  const duties = text
    .split('\n')
    .map((l) => l.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);
  const dirty =
    !saved || saved.duties.join('\n') !== duties.join('\n') || [...chosen].sort().join() !== [...saved.activities].sort().join();

  // Keep what has been said or typed but not saved, so it survives the phone closing the app.
  const loadedFor = useRef('');
  const hasContent = text.trim().length > 0 || chosen.size > 0;
  const chosenKey = [...chosen].sort().join('|');
  useEffect(() => {
    if (!engagementId || loadedFor.current !== `${engagementId}|${date}`) return;
    const id = setTimeout(() => {
      const value = dirty && hasContent ? JSON.stringify({ engagementId, date, text, activities: chosenKey ? chosenKey.split('|') : [] }) : '';
      setSetting(DRAFT_KEY, value).catch(() => {});
    }, 600);
    return () => clearTimeout(id);
  }, [engagementId, date, text, chosenKey, dirty, hasContent]);

  const onSave = async () => {
    if (!engagementId) return;
    if (duties.length === 0 && chosen.size === 0) {
      flash('Tick an activity or add a duty first');
      return;
    }
    await saveLog({ engagementId, date, duties, activities: [...chosen], notes: '', status: 'confirmed' });
    await setSetting(DRAFT_KEY, '').catch(() => {});
    track('log_saved', { duties: duties.length, activities: chosen.size, via, edit: !!saved, daysAgo: Math.round((Date.parse(today) - Date.parse(date)) / 86400000) });
    tick();
    bump();
    setSaved(await getLog(engagementId, date));
    flash(`Logged · ${fmtIsoShort(date)}`);
  };

  // The mic shows only when the tester has it on, the phone supports it, and it has not failed this session.
  const [micFailed, setMicFailed] = useState(false);
  const micAvailable = micOn && !micFailed && speechSupport().available;
  const [typing, setTyping] = useState(false);
  // How today's entry was written, for usage metrics: spoken, tidied, or typed.
  const [via, setVia] = useState<'mic' | 'tidy' | 'typing'>('typing');
  const onMicCrash = (e?: Error) => {
    log('error', 'mic', 'The mic crashed; switched to typing', e);
    markSpeechBroken();
    setMicFailed(true);
    flash('The mic is not working on this phone. Type instead.');
  };
  // Speech goes straight into the draft: appended as duties, activities ticked.
  const onSpoken = (spoken: string) => {
    const d = draftFromText(spoken);
    const lines = [...text.split('\n').map((l) => l.trim()).filter(Boolean), ...(d.duties.length ? d.duties : [spoken.trim()])];
    setText(lines.join('\n'));
    setChosen(new Set([...chosen, ...d.activities]));
    setVia('mic');
    tick();
  };
  const showMic = micAvailable && !typing && text.trim().length === 0;

  // Offer the tidy-up only when it would change something: new lines to split, or new ticks.
  const preview = text.trim() ? draftFromText(text) : null;
  const canTidy =
    !!preview &&
    (preview.duties.join('\n') !== text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') ||
      preview.activities.some((a) => !chosen.has(a)));
  const onTidy = () => {
    const d = draftFromText(text);
    if (d.duties.length === 0 && d.activities.length === 0) return;
    setText(d.duties.join('\n'));
    setChosen(new Set([...chosen, ...d.activities]));
    if (via !== 'mic') setVia('tidy');
    tick();
  };

  const toggle = (a: string) => {
    const next = new Set(chosen);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    setChosen(next);
  };

  const [vesselFilter, setVesselFilter] = useState<string | null>(null);
  const vesselNames = useMemo(
    () => [...new Set([...(voyages ?? []).map((v) => v.vesselName), ...(logs ?? []).map((l) => l.vesselName ?? '')].filter(Boolean))],
    [logs, voyages],
  );
  const diary = useMemo(
    () =>
      buildDiary(
        (logs ?? []).filter((l) => !vesselFilter || l.vesselName === vesselFilter),
        (voyages ?? []).filter((v) => !vesselFilter || v.vesselName === vesselFilter),
      ),
    [logs, voyages, vesselFilter],
  );

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">{date === today ? 'Log today' : 'Edit entry'}</Eyebrow>
        <Display size={36} color="heroFg">
          {fmtIsoShort(date)}
        </Display>
        <Txt size={14} color="heroMuted">
          {current?.vessel.name} · {current?.engagement.position}
        </Txt>
      </Hero>

      <Sheet gap={16} paddingTop={24}>
        <FadeUp>
          <Col gap={10}>
            <Row justify="space-between" style={{ minHeight: 24 }}>
              <Eyebrow>What did you do?</Eyebrow>
              {saved && (
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, borderWidth: 1, borderColor: dirty ? t.colors.brass : t.colors.ok }}>
                  <Eyebrow size={10} ls={1.2} color={dirty ? 'brass' : 'ok'}>
                    {dirty ? 'Unsaved changes' : 'Saved'}
                  </Eyebrow>
                </View>
              )}
            </Row>
            {showMic ? (
              <Contain fallback={null} onError={onMicCrash}>
                <Dictate onDone={onSpoken} onType={() => setTyping(true)} />
              </Contain>
            ) : (
              <>
                <Field
                  value={text}
                  onChangeText={setText}
                  multiline
                  placeholder={'Washed down the exterior\nChanged generator fuel filters\nSafety inspection before departure'}
                  hint={micAvailable ? 'One job per line. Change anything before you save.' : 'One job per line. You can also tap the mic on your keyboard and speak, then tap Tidy into duties.'}
                />
                {canTidy && <Button variant="ghost" icon="check" label="Tidy into duties" onPress={onTidy} />}
                {micAvailable && (
                  <Contain fallback={null} onError={onMicCrash}>
                    <Dictate compact onDone={onSpoken} />
                  </Contain>
                )}
              </>
            )}
          </Col>
        </FadeUp>

        <FadeUp delay={80}>
          <Col gap={10}>
            <Eyebrow>Tick what applies</Eyebrow>
            <Row gap={8} wrap>
              {ACTIVITIES.map((a) => (
                <Chip key={a} label={a} selected={chosen.has(a)} onPress={() => toggle(a)} />
              ))}
            </Row>
          </Col>
        </FadeUp>

        {dayVoyages.length > 0 && (
          <Col gap={8}>
            <Eyebrow>Voyages this day</Eyebrow>
            {dayVoyages.map((v) => (
              <VoyageRow key={v.id} v={v} />
            ))}
          </Col>
        )}

        {saved && !dirty ? (
          <Button variant="ghost" label="Saved" icon="check" iconStrokeWidth={2.4} onPress={() => {}} />
        ) : (
          <Button label={saved ? 'Save changes' : 'Confirm and save'} icon="check" iconStrokeWidth={2.4} height={62} onPress={onSave} />
        )}
        {date !== today && <Button variant="ghost" label="Back to today" onPress={() => setDate(today)} />}

        <Col gap={10} style={{ paddingTop: 12 }}>
          <Row justify="space-between">
            <Eyebrow>Diary</Eyebrow>
            <Pressable onPress={() => router.push('/voyage-new')} accessibilityRole="button" hitSlop={8}>
              <Txt size={13} weight={700} color="accent">
                + Add a past voyage
              </Txt>
            </Pressable>
          </Row>
          {vesselNames.length > 1 && (
            <Row gap={8} wrap>
              <Chip label="All yachts" selected={!vesselFilter} onPress={() => setVesselFilter(null)} />
              {vesselNames.map((n) => (
                <Chip key={n} label={n} selected={vesselFilter === n} onPress={() => setVesselFilter(n)} />
              ))}
            </Row>
          )}
          {diary.length === 0 && (
            <Txt size={13} color="muted">
              Confirmed voyages and daily entries show up here.
            </Txt>
          )}
          {diary.map((d) => (
            <Card key={d.date} gap={8} paddingV={12} onPress={() => setDate(d.date)} accessibilityLabel={`Diary ${d.date}`}>
              <Row justify="space-between">
                <Txt size={15} weight={700}>
                  {fmtIsoShort(d.date)}
                </Txt>
                <Row gap={8}>
                  {d.nm > 0 && (
                    <Txt size={13} weight={700} color="accent" tabular>
                      {d.nm < 10 ? d.nm.toFixed(1) : fmtInt(d.nm)} NM
                    </Txt>
                  )}
                  {d.log ? <Icon name="check" size={16} color="ok" strokeWidth={2.4} /> : null}
                </Row>
              </Row>
              {d.log && (d.log.activities.length > 0 || d.log.duties.length > 0) ? (
                <Txt size={12} color="muted" numberOfLines={2}>
                  {[...d.log.activities, ...d.log.duties].join(' · ')}
                </Txt>
              ) : null}
            </Card>
          ))}
        </Col>
      </Sheet>
    </Screen>
  );
}

function VoyageRow({ v }: { v: Voyage }) {
  return (
    <Card row gap={12} paddingV={12} onPress={() => router.push({ pathname: '/voyage/[id]', params: { id: v.id } })} accessibilityLabel="Voyage">
      <Icon name="send" size={18} color="accent" />
      <Col gap={2} flex={1}>
        <Txt size={14} weight={700} numberOfLines={1}>
          {v.fromName} → {v.toName}
        </Txt>
        <Txt size={12} color="muted">
          {fmtDur(v.underwayMin)} underway{v.nightMin > 0 ? ` · ${fmtDur(v.nightMin)} night` : ''}
        </Txt>
      </Col>
      <Txt size={14} weight={800} tabular>
        {v.distanceNm.toFixed(1)} NM
      </Txt>
    </Card>
  );
}

type DiaryDay = { date: string; nm: number; log: LogEntry | null };

function buildDiary(logs: LogEntry[], voyages: Voyage[]): DiaryDay[] {
  const days = new Map<string, DiaryDay>();
  const day = (date: string) => {
    let d = days.get(date);
    if (!d) days.set(date, (d = { date, nm: 0, log: null }));
    return d;
  };
  for (const l of logs) day(l.date).log = l;
  for (const v of voyages) day(localDate(new Date(v.startedAt))).nm += v.distanceNm;
  return [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 60);
}
