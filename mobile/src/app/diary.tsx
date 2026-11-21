import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BackHero } from '@/components/BackHero';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, Eyebrow, Icon, Row, Sheet, Txt } from '@/components/ui';
import { addDays, dayKey, daysBetween } from '@/domain/dates';
import type { DayKey, LogEntry, Voyage } from '@/domain/types';
import { fmtDay, fmtDur, fmtNm, fmtTime } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';

type Day = { date: DayKey; engagementId: string | null; entry: LogEntry | null; voyages: Voyage[] };

/** History by day, per vessel (SCOPE §3.6). Gaps in the current engagement show as days to fill in. */
export default function DiaryScreen() {
  const s = useAppStore();
  const [vesselId, setVesselId] = useState<string | null>(null);

  const days = useMemo(() => {
    const engOf = (id: string) => s.engagements.find((e) => e.id === id);
    const keep = (engagementId: string) => !vesselId || engOf(engagementId)?.vesselId === vesselId;
    const map = new Map<string, Day>();
    const get = (date: DayKey, engagementId: string) => {
      const k = `${date}|${engagementId}`;
      if (!map.has(k)) map.set(k, { date, engagementId, entry: null, voyages: [] });
      return map.get(k)!;
    };
    for (const e of s.entries) if (keep(e.engagementId)) get(e.date, e.engagementId).entry = e;
    for (const v of s.voyages) if (v.endedAt !== null && keep(v.engagementId)) get(dayKey(v.startedAt), v.engagementId).voyages.push(v);
    // Empty days in the last 30 days of the current engagement.
    if (s.active && keep(s.active.id)) {
      for (let i = 1; i <= 30; i++) {
        const d = addDays(s.today, -i);
        if (daysBetween(s.active.startDate, d) < 0) break;
        get(d, s.active.id);
      }
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [s.entries, s.voyages, s.engagements, s.active, s.today, vesselId]);

  const vesselName = (engagementId: string | null) => {
    const e = s.engagements.find((x) => x.id === engagementId);
    return s.vessels.find((v) => v.id === e?.vesselId)?.name ?? '';
  };

  return (
    <Screen>
      <BackHero eyebrow="Diary" title="Every day on board" subtitle={`${s.entries.length} days logged · ${s.voyages.filter((v) => v.endedAt !== null).length} voyages`} />
      <Sheet gap={10} paddingBottom={32}>
        {s.vessels.length > 1 && (
          <Row gap={8} wrap>
            <Chip label="All" selected={!vesselId} onPress={() => setVesselId(null)} />
            {s.vessels.map((v) => (
              <Chip key={v.id} label={v.name} selected={vesselId === v.id} onPress={() => setVesselId(v.id)} />
            ))}
          </Row>
        )}
        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Button variant="dashed" icon="plus" iconStrokeWidth={2} label="Voyage by hand" onPress={() => router.push('/voyage/new')} />
          </View>
        </Row>

        {days.length === 0 && (
          <Txt size={14} color="muted">
            Nothing yet. Start a voyage or log today.
          </Txt>
        )}

        {days.map((d) => {
          const empty = !d.entry && d.voyages.length === 0;
          return (
            <Card
              key={`${d.date}|${d.engagementId}`}
              gap={8}
              paddingV={14}
              borderColor={empty ? 'cardBorder' : d.entry?.status === 'draft' || d.voyages.some((v) => v.status === 'draft') ? 'warn' : 'cardBorder'}
              onPress={d.engagementId ? () => router.push({ pathname: '/entry', params: { engagement: d.engagementId!, date: d.date } }) : undefined}
              accessibilityLabel={fmtDay(d.date)}>
              <Row justify="space-between">
                <Eyebrow>{fmtDay(d.date)}</Eyebrow>
                <Txt size={12} weight={600} color="muted">
                  {vesselName(d.engagementId)}
                </Txt>
              </Row>
              {empty && (
                <Row gap={8}>
                  <Icon name="plus" size={16} color="accent" />
                  <Txt size={14} weight={700} color="accent">
                    Nothing recorded · add entry
                  </Txt>
                </Row>
              )}
              {d.voyages.map((v) => (
                <Row key={v.id} gap={10}>
                  <Icon name="send" size={16} color="accent" />
                  <Col flex={1} gap={2}>
                    <Txt size={15} weight={700} numberOfLines={1}>
                      {v.startPlace || '—'} → {v.endPlace || '—'}
                    </Txt>
                    <Txt size={12} color="muted" tabular>
                      {fmtTime(v.startedAt)} · {fmtNm(v.distanceNm)} NM · {fmtDur(v.underwayMin)}
                      {v.nightMin > 0 ? ` · ${fmtDur(v.nightMin)} night` : ''}
                      {v.source === 'manual' ? ' · manual' : ''}
                    </Txt>
                  </Col>
                  {v.status === 'draft' ? (
                    <Txt size={12} weight={800} color="warn" onPress={() => router.push(`/voyage/${v.id}`)}>
                      Confirm
                    </Txt>
                  ) : (
                    <Icon name="chevronRight" size={16} color="muted" />
                  )}
                </Row>
              ))}
              {d.entry && (
                <Txt size={13} color={d.entry.status === 'draft' ? 'warn' : 'fg'} numberOfLines={2}>
                  {d.entry.status === 'draft' ? 'Draft · ' : ''}
                  {d.entry.duties.map((x) => x.text).join(' · ') || d.entry.activities.join(' · ') || 'Entry with no duties'}
                </Txt>
              )}
            </Card>
          );
        })}
      </Sheet>
    </Screen>
  );
}
