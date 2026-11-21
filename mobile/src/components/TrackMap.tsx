import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Txt } from '@/components/ui';
import type { Fix } from '@/domain/types';
import { useTokens } from '@/theme';

/**
 * The voyage track drawn to scale on a plain grid. No map tiles: those need
 * MapLibre and a development build (SCOPE §5), and must work offline first.
 */
export function TrackMap({ fixes, height = 140, live }: { fixes: Pick<Fix, 'lat' | 'lon'>[]; height?: number; live?: boolean }) {
  const t = useTokens();
  const W = 320;
  const H = height;
  const pad = 16;

  if (fixes.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.colors.track }}>
        <Txt size={13} weight={600} color="muted">
          {live ? 'Waiting for GPS…' : 'No track recorded'}
        </Txt>
      </View>
    );
  }

  const lats = fixes.map((f) => f.lat);
  const lons = fixes.map((f) => f.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = lons.map((l) => l * k);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const span = Math.max(maxX - minX, maxY - minY, 0.002);
  const scale = Math.min((W - pad * 2) / Math.max(maxX - minX, span * 0.2), (H - pad * 2) / Math.max(maxY - minY, span * 0.2));
  const ox = (W - (maxX - minX) * scale) / 2;
  const oy = (H - (maxY - minY) * scale) / 2;
  const px = (i: number) => ox + (xs[i] - minX) * scale;
  const py = (i: number) => H - (oy + (lats[i] - minY) * scale);

  // Thin to ~400 points for drawing.
  const step = Math.max(1, Math.floor(fixes.length / 400));
  let d = `M${px(0).toFixed(1)} ${py(0).toFixed(1)}`;
  for (let i = step; i < fixes.length; i += step) d += `L${px(i).toFixed(1)} ${py(i).toFixed(1)}`;
  const last = fixes.length - 1;
  d += `L${px(last).toFixed(1)} ${py(last).toFixed(1)}`;

  const grid = [];
  for (let x = 32; x < W; x += 32) grid.push(`M${x} 0V${H}`);
  for (let y = 22; y < H; y += 22) grid.push(`M0 ${y}H${W}`);

  return (
    <View style={{ width: '100%', height }}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} fill="none">
        <Path d={grid.join('')} stroke={t.colors.chart} strokeWidth="1" />
        <Path d={d} stroke={t.colors.track} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} stroke={t.colors.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={px(0)} cy={py(0)} r="7" stroke={t.colors.muted} strokeWidth="1.5" />
        <Circle cx={px(0)} cy={py(0)} r="3" fill={t.colors.muted} />
        <Circle cx={px(last)} cy={py(last)} r="6" fill={t.colors.accent} />
      </Svg>
    </View>
  );
}
