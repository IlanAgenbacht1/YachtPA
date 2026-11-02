import { Redirect, router } from 'expo-router';
import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Blink, Breathe, Drift, FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { TrackMap } from '@/components/TrackMap';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Row, Sheet, Spacer, Tile, Txt } from '@/components/ui';
import { nextCrossing, isNight } from '@/domain/sun';
import { fmtClock, fmtDur, minutesOfDay } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

const WAVE_A = 'M0 22q48.75 -18 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const WAVE_B = 'M0 22q48.75 -14 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
export default function LiveScreen() {
  const t = useTokens();
  const { voyage, stopVoyage, current } = useAppStore();
  const [stopping, setStopping] = useState(false);

  if (!voyage) return stopping ? null : <Redirect href="/" />;

  const last = voyage.fixes[voyage.fixes.length - 1];
  const startMin = minutesOfDay(new Date(voyage.startedAt));
  const clock = last?.ts ?? voyage.startedAt;
  const night = last ? isNight(clock, last.lat, last.lon) : false;
  const nextSun = last ? nextCrossing(clock, last.lat, last.lon, night ? 'sunrise' : 'sunset') : null;

  const onStop = async () => {
    thump();
    setStopping(true);
    const id = await stopVoyage();
    if (id) router.replace({ pathname: '/summary', params: { id } });
    else setStopping(false);
  };

  return (
    <Screen>
      <Hero paddingBottom={58} backdrop={<Waves />}>
        <Row justify="space-between">
          <Row gap={8}>
            <Blink>
              <Dot color="accent" size={8} />
            </Blink>
            <Eyebrow color="heroMuted">
              Underway · {current?.vessel.name}
            </Eyebrow>
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
            Since {fmtClock(startMin)}
            {voyage.track.headingDeg != null ? ` · Heading ${voyage.track.headingDeg}°` : ''}
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
            <Tile on="hero" label="Night" value={fmtDur(voyage.track.nightMin)} />
          </View>
        </Row>
      </Hero>

      <Sheet gap={14} paddingBottom={24}>
        <FadeUp delay={80}>
          <Card gap={10}>
            <Row justify="space-between">
              <Eyebrow>Track</Eyebrow>
              <Txt size={12} weight={600} color="muted">
                {voyage.source === 'sim'
                  ? 'Simulated · 1 min per second'
                  : last
                    ? `GPS ±${Math.round(last.accuracy ?? 0)} m · ${voyage.fixes.length} fixes`
                    : 'Waiting for GPS…'}
              </Txt>
            </Row>
            <TrackMap fixes={voyage.fixes} live />
            {voyage.mode === 'foreground' && (
              <Txt size={12} color="warn">
                Keep YachtPA open with the screen on. To track with the phone locked, allow location “Always” in Settings.
              </Txt>
            )}
            {voyage.mode === 'background' && (
              <Txt size={12} color="muted">
                Tracking with the phone locked. You can put it away.
              </Txt>
            )}
          </Card>
        </FadeUp>

        <FadeUp delay={160}>
          <Card row gap={14} paddingV={10}>
            <Col gap={3} flex={1}>
              <Txt size={15} weight={700}>
                {nextSun ? `${night ? 'Sunrise' : 'Sunset'} ${fmtClock(minutesOfDay(new Date(nextSun)))}` : 'Sun times need a GPS fix'}
              </Txt>
              <Txt size={12} color="muted">
                {night ? 'Night hours are counting' : 'Night hours start automatically'}
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
        <Button variant="danger" icon="stop" label={stopping ? 'Saving…' : 'Stop voyage'} onPress={stopping ? () => {} : onStop} />
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
