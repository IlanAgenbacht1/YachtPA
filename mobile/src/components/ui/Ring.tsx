import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTokens } from '@/theme';

import { useProgress } from '../motion';

export type RingProps = {
  size: number;
  stroke: number;
  /** 0..1 */
  value: number;
  children?: ReactNode;
  /** Animate from empty on mount. */
  animate?: boolean;
};

/** Progress ring in brass over a track, drawn clockwise from 12 o'clock. */
export function Ring({ size, stroke, value, children, animate = true }: RingProps) {
  const t = useTokens();
  const p = useProgress(animate ? 1200 : 0);
  const r = (size - stroke * 2 - 2) / 2;
  const c = 2 * Math.PI * r;
  const shown = Math.max(0, Math.min(1, value)) * p;
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cx} r={r} stroke={t.colors.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke={t.colors.brass}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - shown)}
          fill="none"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      {children}
    </View>
  );
}
