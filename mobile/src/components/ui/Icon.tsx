import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useColor, type ColorProp } from './Txt';

/** Line icons traced from the Deck prototype (24-unit grid, round caps and joins). */
const ICONS = {
  anchor: [
    { c: [12, 5, 3] },
    { d: 'M12 8v14M5 12H2a10 10 0 0 0 20 0h-3' },
  ],
  send: [{ d: 'M3 11l19-9-9 19-2-8-8-2z' }],
  mic: [
    { d: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z' },
    { d: 'M19 10v2a7 7 0 0 1-14 0v-2M12 19v3' },
  ],
  check: [{ d: 'M20 6L9 17l-5-5' }],
  chevronRight: [{ d: 'M9 18l6-6-6-6' }],
  chevronDown: [{ d: 'M6 9l6 6 6-6' }],
  file: [
    { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { d: 'M14 2v6h6' },
  ],
  home: [{ d: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z' }],
  book: [
    { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' },
    { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  ],
  compass: [{ c: [12, 12, 10] }, { d: 'M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z' }],
  user: [{ d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }, { c: [12, 7, 4] }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  stop: [{ r: [5, 5, 14, 14, 3] }],
} as const;

export type IconName = keyof typeof ICONS;

type Shape = { d: string } | { c: readonly [number, number, number] } | { r: readonly [number, number, number, number, number] };

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorProp;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = 'fg', strokeWidth = 2 }: IconProps) {
  const stroke = useColor(color);
  const shapes = ICONS[name] as readonly Shape[];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {shapes.map((s, i) => {
        if ('d' in s) {
          return (
            <Path key={i} d={s.d} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          );
        }
        if ('c' in s) {
          return (
            <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} stroke={stroke} strokeWidth={strokeWidth} />
          );
        }
        return <Rect key={i} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} fill={stroke} />;
      })}
    </Svg>
  );
}
