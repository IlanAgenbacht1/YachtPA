/**
 * Motion primitives that mirror the prototype's CSS keyframes.
 * Looping effects run on Reanimated (off the JS thread); one-shot reveals and
 * count-ups use a small rAF-driven progress hook so they work identically on
 * native and web.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const OUT = Easing.bezier(0.2, 0.8, 0.2, 1);

/** 0 → 1 with a cubic ease-out over `duration` ms, starting after `delay` ms. Returns 1 at once when duration is 0. */
export function useProgress(duration: number, delay = 0): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (duration <= 0) return;
    let raf = 0;
    let start = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      if (!start) start = now;
      const k = Math.min(1, (now - start) / duration);
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [duration, delay]);
  return duration <= 0 ? 1 : p;
}

type Wrap = { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** Slides up and fades in once. FadeUp (10px), Rise (36px) and Enter (12px) are presets. */
export function Reveal({ children, style, dy = 10, duration = 450, delay = 0 }: Wrap & { dy?: number; duration?: number; delay?: number }) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withDelay(delay, withTiming(1, { duration, easing: OUT })));
  }, [k, delay, duration]);
  const s = useAnimatedStyle(() => ({
    opacity: k.get(),
    transform: [{ translateY: dy * (1 - k.get()) }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

export const FadeUp = (p: Wrap & { delay?: number }) => <Reveal dy={10} duration={450} {...p} />;
export const Rise = (p: Wrap & { delay?: number }) => <Reveal dy={36} duration={550} {...p} />;
export const Enter = (p: Wrap) => <Reveal dy={12} duration={400} {...p} />;

/** Opacity 1 ↔ 0.2, the live indicator. */
export function Blink({ children, style }: Wrap) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withTiming(0.2, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Slow scale and opacity swell behind the live distance. */
export function Breathe({ children, style }: Wrap) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [k]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.16 + 0.14 * k.get(),
    transform: [{ scale: 1 + 0.12 * k.get() }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** Expanding ring that fades out, restarting each cycle. */
export function Pulse({ children, style }: Wrap) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false));
  }, [k]);
  const s = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - k.get()),
    transform: [{ scale: 1 + 1.6 * k.get() }],
  }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

/** One bar of the listening meter: scaleY 0.22 ↔ 1, staggered by `delay`. */
export function Bar({ height, color, delay }: { height: number; color: string; delay: number }) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withDelay(delay, withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true)));
  }, [k, delay]);
  const s = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.22 + 0.78 * k.get() }] }));
  return <Animated.View style={[{ width: 4, height, borderRadius: 99, backgroundColor: color }, s]} />;
}

/** Scrolls its child left by `distance` forever; the child is twice as wide as the viewport so it loops seamlessly. */
export function Drift({ children, style, distance, duration }: Wrap & { distance: number; duration: number }) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [k, duration]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: -distance * k.get() }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}
