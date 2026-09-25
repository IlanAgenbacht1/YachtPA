import { View } from 'react-native';

import { useColor, type ColorProp } from './Txt';

/** Status dot: green valid, amber expiring, accent live. */
export function Dot({ color, size = 8 }: { color: ColorProp; size?: number }) {
  const bg = useColor(color);
  return <View style={{ width: size, height: size, borderRadius: 99, backgroundColor: bg }} />;
}
