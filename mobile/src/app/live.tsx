import { Redirect, router } from 'expo-router';
import { useEffect, useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { Blink, Breathe, Drift, FadeUp, Pulse } from '@/components/motion';
import { Screen } from '@/components/Screen';
import { Button, Card, Col, Display, Dot, Eyebrow, Hero, Icon, LookPill, Row, Sheet, Spacer, Tile, Txt } from '@/components/ui';
import { getTrack } from '@/db';
import { nightMinutes, sunDay, type Fix } from '@/domain';
import { fmtClockMs, fmtDur } from '@/lib/format';
import { thump } from '@/lib/haptics';
import { useAppStore } from '@/store/AppStore';
import { useTokens } from '@/theme';

const WAVE_A = 'M0 22q48.75 -18 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const WAVE_B = 'M0 22q48.75 -14 97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0t97.5 0';
const TRACK_POLL_MS = 3000;
const BOX = { w: 320, h: 110, pad: 14 };

export default function LiveScreen() {
  const t = useTokens();
  const { live, stopVoyage } = useAppStore();
  const [stopping, setStopping] = useState(false);
  const [track, setTrack] = useState<Fix[]>([]);
  const voyageId = live?.voyage.id ?? null;

  // The track card and night minutes come from the stored track, refreshed every few seconds.
  useEffect(() => {
    if (!voyageId) return;
    let cancelled = false;
    const load = async () => {
      const fixes = await getTrack(voyageId);
      if (!cancelled) setTrack(fixes);
    };
    void load();
    const id = setInterval(() => void load(), TRACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [voyageId]);

  if (!live && !stopping) return <Redirect href="/" />;
  if (!live) return null;

  const onStop = async () => {
    thump();
    setStopping(true);
    const v = await stopVoyage();
    if (v) router.replace('/summary');
    else router.back();
  };

  const v = live.voyage;
  const last = track[track.length - 1] ?? null;
  const nightMin = nightMinutes(track);
  const sun = last ? sunDay(last.ts, last) : null;
  const sunsetLabel = sun?.sunset ? fmtClockMs(sun.sunset) : '—';
  const path = trackPath(track);
  const end = path ? path.end : null;

  return (
    <Screen>
      <Hero paddingBottom={58} backdrop={<Waves />}>
        <Row justify="space-between">
          <Row gap={8} flex={1}>
            <Blink>
              <Dot color="accent" size={8} />
            </Blink>
            <Eyebrow color="heroMuted" numberOfLines={1}>
              Underway
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
              {v.nm.toFixed(1)}
            </Display>
            <Txt size={20} weight={700} color="heroMuted">
              NM
            </Txt>
          </Row>
          <Txt size={14} color="heroMuted" numberOfLines={1}>
            From {v.start?.place ?? 'first fix'} · {fmtClockMs(v.startedAt)}
            {live.headingDeg !== null ? ` · Heading ${Math.round(live.headingDeg)}°` : ''}
          </Txt>
        </Col>

        <Row gap={10} align="stretch">
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Elapsed" value={fmtDur(live.elapsedMin)} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Speed" value={`${live.speedKn.toFixed(1)} kn`} />
          </View>
          <View style={{ flex: 1 }}>
            <Tile on="hero" label="Night" value={fmtDur(nightMin)} />
          </View>
        </Row>
      </Hero>

      <Sheet gap={14} paddingBottom={24}>
        <FadeUp delay={80}>
          <Card gap={10}>
            <Row justify="space-between">
              <Eyebrow>{v.source === 'sim' ? 'Track · simulated' : 'Track'}</Eyebrow>
              <Txt size={12} weight={600} color="muted">
                {live.accuracyM !== null ? `GPS ±${Math.round(live.accuracyM)} m · ` : ''}
                {v.fixes} fix{v.fixes === 1 ? '' : 'es'}
              </Txt>
            </Row>
            <View style={{ width: '100%', height: BOX.h }}>
              <Svg viewBox={`0 0 ${BOX.w} ${BOX.h}`} width="100%" height={BOX.h} fill="none">
                <Path
                  d="M0 22H320M0 44H320M0 66H320M0 88H320M32 0V110M64 0V110M96 0V110M128 0V110M160 0V110M192 0V110M224 0V110M256 0V110M288 0V110"
                  stroke={t.colors.chart}
                  strokeWidth="1"
                />
                {path ? (
                  <>
                    <Path d={path.d} stroke={t.colors.track} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d={path.d} stroke={t.colors.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={path.start.x} cy={path.start.y} r="8" stroke={t.colors.muted} strokeWidth="1.5" />
                    <Circle cx={path.start.x} cy={path.start.y} r="3.5" fill={t.colors.muted} />
                    <Circle cx={path.end.x} cy={path.end.y} r="6" fill={t.colors.accent} />
                  </>
                ) : null}
              </Svg>
              {end ? (
                <Pulse
                  style={{
                    position: 'absolute',
                    left: `${(end.x / BOX.w) * 100}%`,
                    top: `${(end.y / BOX.h) * 100}%`,
                    width: 12,
                    height: 12,
                    marginLeft: -6,
                    marginTop: -6,
                    borderRadius: 6,
                    backgroundColor: t.colors.accent,
                  }}
                />
              ) : (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={13} weight={600} color="muted">
                    Waiting for the first fix
                  </Txt>
                </View>
              )}
            </View>
            <Row justify="space-between">
              <Txt size={12} weight={600} color="muted">
                {v.start?.place ?? '—'} · {fmtClockMs(v.startedAt)}
              </Txt>
              <Txt size={12} weight={600} color="muted">
                {live.lastFixTs ? `Last fix ${fmtClockMs(live.lastFixTs)}` : 'No fix yet'}
              </Txt>
            </Row>
          </Card>
        </FadeUp>

        <FadeUp delay={160}>
          <Card row gap={14} paddingV={10}>
            <Col gap={3} flex={1}>
              <Txt size={15} weight={700}>
                Sunset {sunsetLabel}
              </Txt>
              <Txt size={12} color="muted">
                Night hours count automatically after sunset
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

type Pt = { x: number; y: number };

/** Fits the track into the card's box with an equirectangular projection, keeping aspect. */
function trackPath(fixes: readonly Fix[]): { d: string; start: Pt; end: Pt } | null {
  if (fixes.length === 0) return null;
  const midLat = fixes.reduce((s, f) => s + f.lat, 0) / fixes.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = fixes.map((f) => f.lon * kx);
  const ys = fixes.map((f) => f.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const innerW = BOX.w - BOX.pad * 2;
  const innerH = BOX.h - BOX.pad * 2;
  const scale = Math.min(innerW / span, innerH / span);
  const usedW = (maxX - minX) * scale;
  const usedH = (maxY - minY) * scale;
  const ox = BOX.pad + (innerW - usedW) / 2;
  const oy = BOX.pad + (innerH - usedH) / 2;
  const pts: Pt[] = xs.map((x, i) => ({ x: ox + (x - minX) * scale, y: oy + (maxY - ys[i]) * scale }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d, start: pts[0], end: pts[pts.length - 1] };
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
