import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Blink, FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Ring, Row, Sheet, Txt } from '@/components/ui';
import { stillUnderway } from '@/domain/sanity';
import { fmtDateShort, fmtDur, fmtInt, fmtMonth, fmtNm } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore, type Live } from '@/store/AppStore';
import { useTokens } from '@/theme';

export default function HomeScreen() {
  const t = useTokens();
  const s = useAppStore();
  const [starting, setStarting] = useState(false);

  if (!s.ready) return <View style={{ flex: 1, backgroundColor: t.colors.bg }} />;
  if (!s.profile.onboardedAt) return <Redirect href="/onboarding" />;

  const onStart = async () => {
    if (starting) return;
    if (!s.active) {
      router.push('/vessels');
      return;
    }
    thump();
    setStarting(true);
    const r = await s.startVoyage();
    setStarting(false);
    if (r.ok) router.push('/live');
    else s.flash(r.reason);
  };

  const q = [...s.quals].sort((a, b) => b.pct - a.pct)[0];
  const months = s.exp.months;
  const maxMonth = Math.max(1, ...months.map((m) => m.nm));
  const unconfirmed = s.voyages.filter((v) => v.endedAt !== null && v.status === 'draft').length;

  return (
    <Screen>
      <Hero compass>
        <Row justify="space-between">
          <Eyebrow color="heroMuted">Today · {fmtDateShort(new Date())}</Eyebrow>
          <Row gap={10}>
            <Row gap={6}>
              <Dot color="ok" size={6} />
              <Txt size={11} weight={700} color="heroMuted">
                Saved on phone
              </Txt>
            </Row>
            <LookPill />
          </Row>
        </Row>

        <Pressable onPress={() => router.push('/vessels')} accessibilityRole="button" accessibilityLabel="Vessels and engagements">
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
              <Display size={34} color="heroFg" numberOfLines={1}>
                {s.activeVessel?.name ?? 'No current yacht'}
              </Display>
              <Txt size={14} color="heroMuted" numberOfLines={1}>
                {s.active ? [s.active.position, s.lastPlace].filter(Boolean).join(' · ') : 'Tap to add the yacht you are on'}
              </Txt>
            </Col>
          </Row>
        </Pressable>

        <Col gap={12} style={{ marginTop: 2 }}>
          {s.live ? (
            <LiveCard live={s.live} />
          ) : (
            <Button label={s.active ? (starting ? 'Starting…' : 'Start voyage') : 'Add current yacht'} icon={s.active ? 'send' : 'plus'} onPress={onStart} />
          )}
          {s.loggedToday && s.loggedToday.status !== 'draft' ? (
            <Button variant="hero" icon="check" iconStrokeWidth={2.4} label="Logged · view entry" onPress={() => router.navigate('/log')} />
          ) : (
            <Button variant="hero" icon="mic" iconStrokeWidth={2} label="Log today" onPress={() => router.navigate('/log')} />
          )}
        </Col>
      </Hero>

      <Sheet gap={12}>
        {s.live && stillUnderway(s.live.voyage.startedAt, s.live.now) && (
          <Notice text={`Tracking for ${Math.floor((s.live.now - s.live.voyage.startedAt) / 3_600_000)} hours. Still underway?`} action="Open" onPress={() => router.push('/live')} />
        )}
        {unconfirmed > 0 && (
          <Notice text={unconfirmed === 1 ? 'One voyage waiting for you to confirm.' : `${unconfirmed} voyages waiting for you to confirm.`} action="Review" onPress={() => router.push('/diary')} />
        )}
        {s.missed > 0 && (
          <Notice text={`Nothing recorded for ${s.missed} days. Add a missing entry?`} action="Diary" onPress={() => router.push('/diary')} />
        )}

        <FadeUp delay={50}>
          <Card onPress={() => router.navigate('/experience')} accessibilityLabel="My experience">
            <Row justify="space-between">
              <Eyebrow>My experience</Eyebrow>
              {s.exp.weekNm > 0 && (
                <Txt size={12} weight={800} color="brass">
                  +{fmtNm(s.exp.weekNm)} NM this week
                </Txt>
              )}
            </Row>
            <Row gap={8} align="flex-start">
              <Stat value={fmtInt(s.exp.nm)} label="NM logged" />
              <Stat value={fmtInt(s.exp.underwayHours)} label="hours underway" />
              <Stat value={fmtInt(s.exp.nightHours)} label="night hours" />
            </Row>
            <Col gap={6}>
              <Row gap={4} align="flex-end" style={{ height: 40 }}>
                {months.map((m, i) => (
                  <View
                    key={m.key}
                    style={{
                      flex: 1,
                      height: Math.max(3, (m.nm / maxMonth) * 40),
                      borderRadius: 3,
                      backgroundColor: i === months.length - 1 ? t.colors.accent : t.colors.track,
                    }}
                  />
                ))}
              </Row>
              <Row justify="space-between">
                <Txt size={11} weight={600} color="muted">
                  {fmtMonth(`${months[0].key}-01`)}
                </Txt>
                <Txt size={11} weight={600} color="muted">
                  {fmtMonth(`${months[months.length - 1].key}-01`)}
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
            <Dot color="ok" />
            <Txt size={13} weight={600} color="muted">
              {s.docCounts.ok} valid
            </Txt>
            {s.docCounts.warn + s.docCounts.danger > 0 && (
              <>
                <View style={{ marginLeft: 4 }}>
                  <Dot color={s.docCounts.danger ? 'danger' : 'warn'} />
                </View>
                <Txt size={13} weight={600} color="muted">
                  {s.docCounts.warn + s.docCounts.danger} expiring
                </Txt>
              </>
            )}
            <Icon name="chevronRight" size={18} color="muted" />
          </Card>
        </FadeUp>

        {q && (
          <FadeUp delay={190}>
            <Card row gap={14} paddingV={14} onPress={() => router.push(`/qualification/${q.def.id}`)} accessibilityLabel={q.def.name}>
              <Ring size={64} stroke={6} value={q.pct}>
                <Txt size={14} weight={800} tabular>
                  {Math.round(q.pct * 100)}%
                </Txt>
              </Ring>
              <Col gap={4} flex={1}>
                <Txt size={15} weight={700}>
                  {q.def.name}
                </Txt>
                <Txt size={12} color="muted">
                  {q.headline ? `${q.headline.display} NM` : ''} · {q.results.filter((r) => r.met).length} of {q.results.filter((r) => r.met !== null).length} done
                </Txt>
                <Txt size={12} weight={700} color="brass">
                  {q.appearsToMeet ? 'Appears to meet the logged requirements' : q.seaTimeMet ? 'Sea time appears done' : 'Keep logging'}
                </Txt>
              </Col>
              <Icon name="chevronRight" size={18} color="muted" />
            </Card>
          </FadeUp>
        )}
      </Sheet>
    </Screen>
  );
}

function Notice({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <Card row gap={10} paddingV={12} borderColor="warn" onPress={onPress} accessibilityLabel={text}>
      <Icon name="alert" size={18} color="warn" />
      <Txt size={14} weight={600} style={{ flex: 1 }}>
        {text}
      </Txt>
      <Txt size={13} weight={800} color="accent">
        {action}
      </Txt>
    </Card>
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
function LiveCard({ live }: { live: Live }) {
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
        <Eyebrow color="heroMuted">Underway</Eyebrow>
        <Row gap={8} align="baseline">
          <Display size={30} tabular ls={-0.6} color="heroFg">
            {live.stats.distanceNm.toFixed(1)}
          </Display>
          <Txt size={13} weight={700} color="heroMuted" tabular>
            NM · {fmtDur(live.stats.durationMin)}
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
