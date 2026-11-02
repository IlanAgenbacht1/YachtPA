import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { FadeUp, Blink } from '@/components/motion';
import { QualCard } from '@/components/QualCard';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Row, Sheet, Txt } from '@/components/ui';
import { getDraftVoyage, getExperience, getLog, listDocs, localDate } from '@/db/repo';
import { docCounts } from '@/lib/docs';
import { getQualificationResults } from '@/lib/quals';
import { fmtDateShort, fmtDur, fmtNum } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore, useQuery, type LiveVoyage } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function HomeScreen() {
  const t = useTokens();
  const { voyage, startVoyage, current, simulate } = useAppStore();
  const exp = useQuery(getExperience);
  const docs = useQuery(listDocs);
  const draft = useQuery(getDraftVoyage);
  const quals = useQuery(getQualificationResults);
  const todayLog = useQuery(() => (current ? getLog(current.engagement.id, localDate()) : Promise.resolve(null)), [current?.engagement.id]);
  if (!current) return null;
  const loggedToday = todayLog?.status === 'confirmed';
  const counts = docCounts(docs ?? []);
  // The next one to work towards: furthest along that is not yet met, else the last met.
  const nextQual = quals ? ([...quals].filter((q) => !q.seaTimeMet).sort((a, b) => b.progress - a.progress)[0] ?? quals[quals.length - 1]) : undefined;
  const maxMonth = Math.max(1, ...(exp?.months.map((m) => m.nm) ?? [0]));

  const onStart = async () => {
    thump();
    if (await startVoyage()) router.push('/live');
  };

  return (
    <Screen>
      <Hero compass>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Today · {fmtDateShort(new Date())}</Eyebrow>
          <Row gap={10}>
            <Row gap={6}>
              <Dot color={simulate ? 'warn' : 'ok'} size={6} />
              <Txt size={11} weight={700} color="heroMuted">
                {simulate ? 'Simulated GPS' : 'On this iPhone'}
              </Txt>
            </Row>
            <LookPill />
          </Row>
        </Row>

        <Row gap={14}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.btn2,
              borderWidth: 1,
              borderColor: t.colors.btn2Border,
            }}>
            <Icon name="anchor" size={24} color="heroFg" strokeWidth={1.8} />
          </View>
          <Col gap={3} flex={1}>
            <Display size={38} color="heroFg" numberOfLines={1}>
              {current.vessel.name}
            </Display>
            <Txt size={14} color="heroMuted">
              {current.engagement.position} · {current.profile.name}
            </Txt>
          </Col>
        </Row>

        <Col gap={12} style={{ marginTop: 2 }}>
          {voyage ? <LiveCard voyage={voyage} /> : <Button label="Start voyage" icon="send" onPress={onStart} />}
          {loggedToday ? (
            <Button variant="hero" icon="check" iconStrokeWidth={2.4} label="Logged · view entry" onPress={() => router.navigate('/log')} />
          ) : (
            <Button variant="hero" icon="mic" iconStrokeWidth={2} label="Log today" onPress={() => router.navigate('/log')} />
          )}
        </Col>
      </Hero>

      <Sheet gap={12}>
        {draft && !voyage && (
          <Card
            row
            gap={12}
            paddingV={14}
            borderColor="brass"
            onPress={() => router.push({ pathname: '/summary', params: { id: draft.id } })}
            accessibilityLabel="Review unconfirmed voyage">
            <Icon name="send" size={20} color="brass" />
            <Col gap={2} flex={1}>
              <Txt size={15} weight={700}>
                Voyage to confirm
              </Txt>
              <Txt size={12} color="muted">
                {draft.distanceNm.toFixed(1)} NM · {fmtDateShort(new Date(draft.startedAt))}
              </Txt>
            </Col>
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        )}
        <FadeUp delay={50}>
          <Card onPress={() => router.navigate('/experience')} accessibilityLabel="My experience">
            <Row justify="space-between">
              <Eyebrow>My experience</Eyebrow>
              {exp && exp.weekNm > 0 ? (
                <Txt size={12} weight={800} color="brass">
                  +{fmtNum(exp.weekNm)} NM this week
                </Txt>
              ) : null}
            </Row>
            <Row gap={8} align="flex-start">
              <Stat value={fmtNum(exp?.nm ?? 0)} label="NM logged" />
              <Stat value={fmtNum(exp?.underwayHours ?? 0)} label="hours underway" />
              <Stat value={fmtNum(exp?.nightHours ?? 0)} label="night hours" />
            </Row>
            <Col gap={6}>
              <Row gap={4} align="flex-end" style={{ height: 40 }}>
                {(exp?.months ?? []).map((m, i, all) => (
                  <View
                    key={m.label}
                    style={{
                      flex: 1,
                      height: 4 + (36 * m.nm) / maxMonth,
                      borderRadius: 3,
                      backgroundColor: i === all.length - 1 ? t.colors.accent : t.colors.track,
                    }}
                  />
                ))}
              </Row>
              <Row justify="space-between">
                <Txt size={11} weight={600} color="muted">
                  {exp?.months[0]?.label}
                </Txt>
                <Txt size={11} weight={600} color="muted">
                  {exp?.months[11]?.label}
                </Txt>
              </Row>
            </Col>
          </Card>
        </FadeUp>

        <FadeUp delay={120}>
          <Card row gap={10} paddingV={14} onPress={() => router.navigate('/documents')} accessibilityLabel="Documents">
            <Icon name="file" size={20} color="muted" />
            <Txt size={15} weight={700} style={{ flex: 1 }}>
              Documents
            </Txt>
            {(docs?.length ?? 0) === 0 ? (
              <Txt size={13} weight={600} color="muted">
                Add your certificates
              </Txt>
            ) : (
              <>
                {counts.ok > 0 && (
                  <>
                    <Dot color="ok" />
                    <Txt size={13} weight={600} color="muted">
                      {counts.ok} valid
                    </Txt>
                  </>
                )}
                {counts.warn + counts.danger > 0 && (
                  <>
                    <View style={{ marginLeft: 4 }}>
                      <Dot color={counts.danger ? 'danger' : 'warn'} />
                    </View>
                    <Txt size={13} weight={600} color="muted">
                      {counts.warn + counts.danger} {counts.danger ? 'to renew' : 'expiring'}
                    </Txt>
                  </>
                )}
              </>
            )}
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        </FadeUp>

        {nextQual && (
          <FadeUp delay={190}>
            <QualCard r={nextQual} />
          </FadeUp>
        )}
      </Sheet>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Col gap={4} flex={1}>
      <Display size={32} tabular ls={-0.64} numberOfLines={1}>
        {value}
      </Display>
      <Txt size={12} color="muted">
        {label}
      </Txt>
    </Col>
  );
}

/** Replaces the Start button while a voyage is running. */
function LiveCard({ voyage }: { voyage: LiveVoyage }) {
  const t = useTokens();
  return (
    <Pressable
      onPress={() => router.push('/live')}
      accessibilityRole="button"
      accessibilityLabel="View live voyage"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 12,
          paddingLeft: 18,
          paddingRight: 14,
          borderRadius: t.radius.lg,
          backgroundColor: t.colors.btn2,
          borderWidth: 1,
          borderColor: t.colors.accent,
          boxShadow: t.shadows.button,
        },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      <Blink>
        <Dot color="accent" size={10} />
      </Blink>
      <Col gap={3} flex={1}>
        <Eyebrow color="heroMuted">Underway{voyage.source === 'sim' ? ' · simulated' : ''}</Eyebrow>
        <Row gap={8} align="baseline">
          <Display size={30} tabular ls={-0.6} color="heroFg">
            {voyage.nm.toFixed(1)}
          </Display>
          <Txt size={13} weight={700} color="heroMuted" tabular>
            NM · {fmtDur(voyage.elapsedMin)}
          </Txt>
        </Row>
      </Col>
      <View style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 99, backgroundColor: t.colors.accent }}>
        <Eyebrow size={11} ls={1.1} color="accentFg">
          View
        </Eyebrow>
      </View>
    </Pressable>
  );
}
