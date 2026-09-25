import { View, type ViewProps, type ViewStyle } from 'react-native';

type FlexProps = ViewProps & {
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  flex?: number;
};

export function Row({ gap, align = 'center', justify, wrap, flex, style, ...rest }: FlexProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'row', alignItems: align, justifyContent: justify, gap },
        wrap && { flexWrap: 'wrap' },
        flex !== undefined && { flex },
        style,
      ]}
    />
  );
}

export function Col({ gap, align, justify, flex, style, ...rest }: FlexProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: 'column', alignItems: align, justifyContent: justify, gap },
        flex !== undefined && { flex },
        style,
      ]}
    />
  );
}

/** Fills leftover space so what follows sits at the bottom of a sheet. */
export function Spacer() {
  return <View style={{ flexGrow: 1 }} />;
}
