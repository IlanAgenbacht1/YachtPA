import { Redirect, router } from 'expo-router';
import { useId } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Blink, Breathe, Drift, FadeUp, Pulse, useProgress } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Row, Sheet, Spacer, Tile, Txt } from '@/components/ui';
import { passage, vessel } from '@/data/sample';
import { fmtClock, fmtDur } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

const WAVE_A = 'M0 22q48.75 -18 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const WAVE_B = 'M0 22q48.75 -14 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const TRACK = 'M14 84C62 76 96 40 144 44S222 72 262 40 300 24 308 20';
const TRACK_LEN = 340;

export default function LiveScreen() {
  const t = useTokens();
  const { voyage, stopVoyage } = useAppStore();
  const draw = useProgress(2200);

  if (!voyage) return <Redirect href="/" />;

  const onStop = () => {
    thump();
    stopVoyage();
    router.replace('/summary');
  };

  return (
    <Screen>
      <Hero paddingBottom={58} backdrop={<Waves />}>
        <Row justify="space-between">
          <Row gap={8}>
            <Blink>
              <Dot color="accent" size={8} />
            </Blink>
            <Eyebrow color="heroMuted">Underway · {vessel.name}</Eyebrow>
          </Row>
          <Row gap={8}>
            <LookPill />
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Minimise"
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.btn2,
                borderWidth: 1,
                borderColor: t.colors.btn2Border,
              }}>
              <Icon name="chevronDown" size={20} color="heroFg" />
            </Pressable>
          </Row>
        </Row>

        <Col gap={6} align="flex-start">
          <Breathe style={{ position: 'absolute', left: -30, top: -40, width: 240, height: 170 }}>
            <Glow />
          </Breathe>
          <Row gap={10} align="baseline">
            <Display size={96} lh={92} ls={-1.92} tabular color="heroFg">
              {voyage.nm.toFixed(1)}
            </Display>
            <Txt size={20} weight={700} color="heroMuted">
              NM
            </Txt>
          </Row>
          <Txt size={14} color="heroMuted">
            From {voyage.from} · {fmtClock(voyage.startMin)} · Heading {voyage.headingDeg}°
          </Txt>
        </Col>

        <Row gap={10} align="stretch">
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Elapsed" value={fmtDur(voyage.elapsedMin)} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Speed" value={`${voyage.speed.toFixed(1)} kn`} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Night" value="0h 00m" />
          </View>
        </Row>
      </Hero>

      <Sheet gap={14} paddingBottom={24}>
        <FadeUp delay={80}>
          <Card gap={10}>
            <Row justify="space-between">
              <Eyebrow>Track</Eyebrow>
              <Txt size={12} weight={600} color="muted">
                GPS ±{passage.gpsAccuracyM} m · 1 fix per minute
              </Txt>
            </Row>
            <View style={{ width: '100%', height: 110 }}>
              <Svg viewBox="0 0 320 110" width="100%" height="110" fill="none">
                <Path
                  d="M0 22H320M0 44H320M0 66H320M0 88H320M32 0V110M64 0V110M96 0V110M128 0V110M160 0V110M192 0V110M224 0V110M256 0V110M288 0V110"
                  stroke={t.colors.chart}
                  strokeWidth="1"
                />
                <Path d="M-10 95C40 80 70 100 120 88S200 60 250 78 300 70 330 60" stroke={t.colors.chart} strokeWidth="1.2" strokeDasharray="3 4" />
                <Path d="M-10 60C30 50 60 70 110 58S180 30 240 48 290 40 330 28" stroke={t.colors.chart} strokeWidth="1.2" strokeDasharray="3 4" />
                <Path d={TRACK} stroke={t.colors.track} strokeWidth="7" strokeLinecap="round" />
                <Path
                  d={TRACK}
                  stroke={t.colors.accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${TRACK_LEN}`}
                  strokeDashoffset={TRACK_LEN * (1 - draw)}
                />
                <Circle cx="14" cy="84" r="8" stroke={t.colors.muted} strokeWidth="1.5" />
                <Circle cx="14" cy="84" r="3.5" fill={t.colors.muted} />
                <Circle cx="308" cy="20" r="6" fill={t.colors.accent} />
              </Svg>
              <Pulse
                style={{
                  position: 'absolute',
                  left: '96.25%',
                  top: '18.2%',
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: 6,
                  backgroundColor: t.colors.accent,
                }}
              />
            </View>
            <Row justify="space-between">
              <Txt size={12} weight={600} color="muted">
                {voyage.from} · {fmtClock(voyage.startMin)}
              </Txt>
              <Txt size={12} weight={600} color="muted">
                {voyage.to} · {passage.aheadNm} NM ahead
              </Txt>
            </Row>
          </Card>
        </FadeUp>

        <FadeUp delay={160}>
          <Card row gap={14} paddingV={10}>
            <Col gap={3} flex={1}>
              <Txt size={15} weight={700}>
                Sunset {passage.sunset}
              </Txt>
              <Txt size={12} color="muted">
                Night hours start automatically
              </Txt>
            </Col>
            <Svg viewBox="0 0 120 44" width={120} height={44} fill="none">
              <Path d="M14 40H106" stroke={t.colors.cardBorder} strokeWidth="1" />
              <Path d="M26 40A34 34 0 0 1 94 40" stroke={t.colors.track} strokeWidth="2" />
              <Path d="M26 40A34 34 0 0 1 72.5 8.4" stroke={t.colors.brass} strokeWidth="2" strokeLinecap="round" />
              <Circle cx="72.5" cy="8.4" r="5" fill={t.colors.brass} />
            </Svg>
          </Card>
        </FadeUp>

        <Spacer />
        <Button variant="danger" icon="stop" label="Stop voyage" onPress={onStop} />
      </Sheet>
    </Screen>
  );
}

/** Soft accent haze behind the distance, done as a radial gradient so it renders on every platform. */
function Glow() {
  const t = useTokens();
  const id = useId();
  return (
    <Svg width="100%" height="100%" viewBox="0 0 240 170">
      <Defs>
        <RadialGradient id={`glow${id}`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={t.colors.accent} stopOpacity={1} />
          <Stop offset="1" stopColor={t.colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="120" cy="85" rx="120" ry="85" fill={`url(#glow${id})`} />
    </Svg>
  );
}

/** Two wave lines drifting left across the foot of the hero. */
function Waves() {
  const t = useTokens();
  return (
    <>
      <Drift distance={390} duration={7000} style={{ position: 'absolute', left: 0, bottom: 32, width: 780, height: 44, opacity: 0.3 }}>
        <Svg viewBox="0 0 780 44" width={780} height={44} fill="none">
          <Path d={WAVE_A} stroke={t.colors.heroFg} strokeWidth="1.6" />
        </Svg>
      </Drift>
      <Drift distance={390} duration={11000} style={{ position: 'absolute', left: 0, bottom: 44, width: 780, height: 44, opacity: 0.13 }}>
        <Svg viewBox="0 0 780 44" width={780} height={44} fill="none">
          <Path d={WAVE_B} stroke={t.colors.heroFg} strokeWidth="1.6" />
        </Svg>
      </Drift>
    </>
  );
}
