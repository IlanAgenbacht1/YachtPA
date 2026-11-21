import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { BackHero } from '@/components/BackHero';
import { EntryEditor } from '@/components/EntryEditor';
import { Screen } from '@/components/Screen';
import { Card, Col, Icon, Row, Sheet, Txt } from '@/components/ui';
import { dayKey, isDayKey } from '@/domain/dates';
import { fmtDay, fmtDur, fmtNm } from '@/lib/format';
import { useAppStore, useRecordContext } from '@/store/AppStore';

/** One day in the diary: its voyages, and its log entry to view, add or edit. */
export default function EntryScreen() {
  const { engagement: engagementId, date } = useLocalSearchParams<{ engagement: string; date: string }>();
  const s = useAppStore();
  const { engagement, vessel } = useRecordContext(engagementId);
  if (!s.ready) return null;
  if (!engagement || !date || !isDayKey(date)) return <Redirect href="/diary" />;

  const entry = s.entries.find((e) => e.engagementId === engagement.id && e.date === date) ?? null;
  const voyages = s.voyages.filter((v) => v.engagementId === engagement.id && v.endedAt !== null && dayKey(v.startedAt) === date);

  return (
    <Screen>
      <BackHero eyebrow={vessel?.name ?? 'Diary'} title={fmtDay(date)} subtitle={engagement.position} />
      <Sheet gap={14} paddingTop={24} paddingBottom={32}>
        {voyages.map((v) => (
          <Card key={v.id} row gap={12} paddingV={14} onPress={() => router.push(`/voyage/${v.id}`)} accessibilityLabel="Open voyage">
            <Icon name="send" size={18} color="accent" />
            <Col flex={1} gap={2}>
              <Txt size={15} weight={700}>
                {v.startPlace || '—'} → {v.endPlace || '—'}
              </Txt>
              <Txt size={12} color="muted">
                {fmtNm(v.distanceNm)} NM · {fmtDur(v.underwayMin)} underway{v.status === 'draft' ? ' · not confirmed' : ''}
              </Txt>
            </Col>
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        ))}
        <Row>
          <Txt size={12} color="muted">
            {entry ? '' : 'No entry for this day yet.'}
          </Txt>
        </Row>
        <EntryEditor
          key={entry?.updatedAt ?? 'new'}
          engagementId={engagement.id}
          date={date}
          position={engagement.position}
          existing={entry}
          onSaved={(confirmed) => s.flash(confirmed ? `Logged · ${fmtDay(date, false)}` : 'Saved as draft')}
        />
      </Sheet>
    </Screen>
  );
}
