import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Bar, Blink, FadeUp, Rise } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Chip, Col, Display, Eyebrow, Hero, Icon, Row, Sheet, Spacer, Txt } from '@/components/ui';
import { activities, draftActivities, draftDuties, vessel } from '@/data/sample';
import { fmtDateLong } from '@/lib/format';
import { tick } from '@/lib/haptics';
import { transcriptSoFar, useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

const BAR_HEIGHTS = [18, 30, 40, 24, 36, 16, 42, 28, 20, 38, 26, 14, 32, 22];

export default function LogScreen() {
  const t = useTokens();
  const { logPhase, transcriptWords, loggedToday, startRecording, resetLog, confirmLog, flash, soon } = useAppStore();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Set<string>>(new Set(draftActivities));

  // Leaving the tab abandons an unconfirmed recording, as in the prototype.
  useFocusEffect(
    useCallback(() => {
      return () => resetLog();
    }, [resetLog]),
  );

  const today = new Date();
  const showEntry = logPhase === 'draft' || (loggedToday && logPhase === 'idle');

  const onConfirm = () => {
    tick();
    confirmLog();
    router.navigate('/');
    flash(`Logged · ${fmtDateLong(today)}`);
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  return (
    <Screen>
      <Hero gap={10}>
        <Eyebrow color="heroMuted">Log today</Eyebrow>
        <Display size={36} color="heroFg">
          {fmtDateLong(today)}
        </Display>
        <Txt size={14} color="heroMuted">
          {vessel.name} · {vessel.position}
        </Txt>
      </Hero>

      <Sheet gap={16} paddingTop={24}>
        {logPhase === 'idle' && !showEntry && (
          <>
            <FadeUp>
              <Col align="center" gap={20} style={{ paddingTop: 22, paddingBottom: 8 }}>
                <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', top: -30, left: -30, right: -30, bottom: -30, borderRadius: 999, backgroundColor: t.colors.accent, opacity: 0.07 }} />
                  <View style={{ position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 999, backgroundColor: t.colors.accent, opacity: 0.12 }} />
                  <Pressable
                    onPress={startRecording}
                    accessibilityRole="button"
                    accessibilityLabel="Start recording"
                    style={({ pressed }) => [
                      {
                        width: 116,
                        height: 116,
                        borderRadius: 58,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: t.colors.accent,
                        boxShadow: t.shadows.button,
                      },
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}>
                    <Icon name="mic" size={46} color="accentFg" strokeWidth={1.9} />
                  </Pressable>
                </View>
                <Col align="center" gap={4}>
                  <Txt size={17} weight={700}>
                    Tap and say what you did today
                  </Txt>
                  <Txt size={13} color="muted">
                    The app writes it up. You confirm.
                  </Txt>
                </Col>
              </Col>
            </FadeUp>
            <FadeUp delay={100}>
              <Col gap={10}>
                <Eyebrow>Or tick what you did</Eyebrow>
                <Row gap={8} wrap>
                  {activities.map((a) => (
                    <Chip key={a} label={a} selected={ticked.has(a)} onPress={() => toggle(ticked, setTicked, a)} />
                  ))}
                </Row>
              </Col>
            </FadeUp>
          </>
        )}

        {logPhase === 'rec' && (
          <>
            <Col align="center" gap={18} style={{ paddingTop: 22, paddingBottom: 4 }}>
              <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 999, backgroundColor: t.colors.accent, opacity: 0.12 }} />
                <View
                  style={{
                    width: 116,
                    height: 116,
                    borderRadius: 58,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: t.colors.accent,
                    boxShadow: t.shadows.button,
                  }}>
                  <Icon name="mic" size={46} color="accentFg" strokeWidth={1.9} />
                </View>
              </View>
              <Row gap={4} style={{ height: 44 }}>
                {BAR_HEIGHTS.map((h, i) => (
                  <Bar key={i} height={h} color={t.colors.accent} delay={i * 70} />
                ))}
              </Row>
              <Blink>
                <Eyebrow color="accent">Listening</Eyebrow>
              </Blink>
            </Col>
            <Card style={{ minHeight: 120 }}>
              <Txt size={16} lh={24}>
                {transcriptSoFar(transcriptWords)}
              </Txt>
            </Card>
          </>
        )}

        {showEntry && (
          <>
            <Rise>
              <Card gap={12}>
                <Row justify="space-between">
                  <Eyebrow>{vessel.position} duties</Eyebrow>
                  <View
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 9,
                      borderRadius: 99,
                      borderWidth: 1,
                      borderColor: loggedToday ? t.colors.ok : t.colors.brass,
                    }}>
                    <Eyebrow size={10} ls={1.2} color={loggedToday ? 'ok' : 'brass'}>
                      {loggedToday ? 'Saved' : 'AI draft'}
                    </Eyebrow>
                  </View>
                </Row>
                <Col gap={10}>
                  {draftDuties.map((d, i) => (
                    <FadeUp key={d} delay={50 + i * 130}>
                      <Row gap={10} align="flex-start">
                        <View style={{ marginTop: 2 }}>
                          <Icon name="check" size={18} color="accent" strokeWidth={2.4} />
                        </View>
                        <Txt size={15} lh={20} style={{ flex: 1 }}>
                          {d}
                        </Txt>
                      </Row>
                    </FadeUp>
                  ))}
                </Col>
              </Card>
            </Rise>
            <FadeUp delay={700}>
              <Row gap={8} wrap>
                {[...draftActivities, ...activities.filter((a) => !draftActivities.includes(a))].map((a) => (
                  <Chip key={a} label={a} selected={chosen.has(a)} onPress={() => toggle(chosen, setChosen, a)} />
                ))}
              </Row>
            </FadeUp>
            <FadeUp delay={800}>
              <Txt size={12} weight={600} color="muted">
                {loggedToday ? 'Confirmed. Edit anything and it stays a draft until you confirm again.' : 'Nothing added that you did not say. Edit anything before you confirm.'}
              </Txt>
            </FadeUp>
            <Spacer />
            <FadeUp delay={850}>
              {loggedToday ? (
                <Button variant="ghost" label="Edit entry" onPress={soon} />
              ) : (
                <Button label="Confirm and save" icon="check" iconStrokeWidth={2.4} height={62} onPress={onConfirm} />
              )}
            </FadeUp>
            <View style={{ height: 12 }} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}
