import { Redirect, router } from 'expo-router';
import { useEffect, useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Blink, Breathe, Drift, FadeUp } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { TrackMap } from '@/components/TrackMap';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Row, Sheet, Spacer, Tile, Txt } from '@/components/ui';
import { getTrack } from '@/db/repo';
import { placeName } from '@/domain/places';
import { stillUnderway } from '@/domain/sanity';
import { isNight, nextTransition } from '@/domain/sun';
import type { Fix } from '@/domain/types';
import { fmtDur, fmtTime } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

const WAVE_A = 'M0 22q48.75 -18 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const WAVE_B = 'M0 22q48.75 -14 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';

const MODE_NOTE = {
  background: 'Tracking in the background · 1 fix per 30 s',
  foreground: 'Keep YachtPA open: background tracking needs "Always" location',
  simulated: 'Simulated GPS · 1 minute per second',
} as const;

export default function LiveScreen() {
  const t = useTokens();
  const { live, stopVoyage, activeVessel, voyages, ready } = useAppStore();
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [stopping, setStopping] = useState(false);

  const voyageId = live?.voyage.id;
  const n = live?.fixes ?? 0;
  useEffect(() => {
    if (!voyageId) return;
    getTrack(voyageId).then(setFixes);
  }, [voyageId, n]);

  if (!live) {
    // The first reading of a just-started voyage lands within a couple of seconds.
    if (!ready || voyages.some((v) => v.endedAt === null)) return <Screen>{null}</Screen>;
    return <Redirect href="/" />;
  }

  const st = live.stats;
  const first = st.first;
  const last = st.last;
  const night = last ? isNight(live.now, last.lat, last.lon) : false;
  const next = last ? nextTransition(live.now, last.lat, last.lon, night ? 'sunrise' : 'sunset') : null;

  const onStop = async () => {
    if (stopping) return;
    thump();
    setStopping(true);
    const id = await stopVoyage();
    setStopping(false);
    if (id) router.replace(`/voyage/${id}`);
  };

  return (
    <Screen>
      <Hero paddingBottom={58} backdrop={<Waves />}>
        <Row justify="space-between">
          <Row gap={8}>
            <Blink>
              <Dot color="accent" size={8} />
            </Blink>
            <Eyebrow color="heroMuted">Underway · {activeVessel?.name ?? ''}</Eyebrow>
          </Row>
          <Row gap={8}>
            <LookPill />
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
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
              {st.distanceNm.toFixed(1)}
            </Display>
            <Txt size={20} weight={700} color="heroMuted">
              NM
            </Txt>
          </Row>
          <Txt size={14} color="heroMuted">
            {first ? `From ${placeName(first.lat, first.lon)} · ` : ''}
            {fmtTime(live.voyage.startedAt)}
          </Txt>
        </Col>

        <Row gap={10} align="stretch">
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Elapsed" value={fmtDur(st.durationMin)} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Speed" value={`${st.currentKn.toFixed(1)} kn`} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Night" value={fmtDur(st.nightMin)} />
          </View>
        </Row>
      </Hero>

      <Sheet gap={14} paddingBottom={24}>
        {stillUnderway(live.voyage.startedAt, live.now) && (
          <Card row gap={10} paddingV={12} borderColor="warn">
            <Icon name="alert" size={18} color="warn" />
            <Txt size={14} weight={600} style={{ flex: 1 }}>
              Tracking for {Math.floor((live.now - live.voyage.startedAt) / 3_600_000)} hours. Still underway?
            </Txt>
          </Card>
        )}

        <FadeUp delay={80}>
          <Card gap={10}>
            <Row justify="space-between">
              <Eyebrow>Track</Eyebrow>
              <Txt size={12} weight={600} color="muted">
                {last?.accuracy ? `GPS ±${Math.round(last.accuracy)} m · ` : ''}
                {live.fixes} fixes
              </Txt>
            </Row>
            <TrackMap fixes={fixes} height={130} live />
            <Txt size={12} weight={600} color={live.mode === 'foreground' ? 'warn' : 'muted'}>
              {MODE_NOTE[live.mode]}
            </Txt>
          </Card>
        </FadeUp>

        {next && (
          <FadeUp delay={160}>
            <Card row gap={14} paddingV={12}>
              <Col gap={3} flex={1}>
                <Txt size={15} weight={700}>
                  {night ? 'Sunrise' : 'Sunset'} {fmtTime(next)}
                </Txt>
                <Txt size={12} color="muted">
                  {night ? 'Night hours are counting' : 'Night hours start automatically'}
                </Txt>
              </Col>
              <Txt size={13} weight={700} color="brass" tabular>
                {st.maxKn > 0 ? `Max ${st.maxKn.toFixed(1)} kn` : ''}
              </Txt>
            </Card>
          </FadeUp>
        )}

        <Spacer />
        <Button variant="danger" icon="stop" label={stopping ? 'Stopping…' : 'Stop voyage'} onPress={onStop} />
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
