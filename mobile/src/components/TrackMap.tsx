import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Fix } from '@/domain/track';
import { useTokens } from '@/theme';

import { Pulse } from './motion';

const W = 320;
const H = 110;
const PAD = 14;
const GRID = 'M0 22H320M0 44H320M0 66H320M0 88H320M32 0V110M64 0V110M96 0V110M128 0V110M160 0V110M192 0V110M224 0V110M256 0V110M288 0V110';

/** Fits the track into the box, north up, keeping proportions. At most ~400 points are drawn. */
function project(fixes: Fix[]): { path: string; start: [number, number]; end: [number, number] } | null {
  if (fixes.length === 0) return null;
  const step = Math.max(1, Math.floor(fixes.length / 400));
  const pts0 = fixes.filter((_, i) => i % step === 0 || i === fixes.length - 1);
  const k = Math.cos((pts0[0].lat * Math.PI) / 180);
  const xs = pts0.map((f) => f.lon * k);
  const ys = pts0.map((f) => f.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, (maxY - minY) * ((W - 2 * PAD) / (H - 2 * PAD)), 1e-4);
  const scale = (W - 2 * PAD) / span;
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const pts = xs.map((x, i): [number, number] => [offX + (x - minX) * scale, H - (offY + (ys[i] - minY) * scale)]);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { path, start: pts[0], end: pts[pts.length - 1] };
}

/** The voyage track on a chart grid. `live` adds a pulse on the current position. */
export function TrackMap({ fixes, live }: { fixes: Fix[]; live?: boolean }) {
  const t = useTokens();
  const proj = project(fixes);
  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" fill="none">
        <Path d={GRID} stroke={t.colors.chart} strokeWidth="1" />
        {proj && (
          <>
            <Path d={proj.path} stroke={t.colors.track} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={proj.path} stroke={t.colors.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={proj.start[0]} cy={proj.start[1]} r="8" stroke={t.colors.muted} strokeWidth="1.5" />
            <Circle cx={proj.start[0]} cy={proj.start[1]} r="3.5" fill={t.colors.muted} />
            <Circle cx={proj.end[0]} cy={proj.end[1]} r="6" fill={t.colors.accent} />
          </>
        )}
      </Svg>
      {proj && live && (
        <Pulse
          style={{
            position: 'absolute',
            left: `${(proj.end[0] / W) * 100}%`,
            top: `${(proj.end[1] / H) * 100}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: 6,
            backgroundColor: t.colors.accent,
          }}
        />
      )}
    </View>
  );
}
