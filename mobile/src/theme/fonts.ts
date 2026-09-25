/**
 * Font loading and weight resolution.
 *
 * React Native treats every weight of a custom font as its own family, so a
 * component asks for `fontFor(tokens, 'body', 700)` and gets back the exact
 * family name that was registered with expo-font. Weights that a family does
 * not ship (IBM Plex Sans has no 800) fall to the nearest one it does.
 */
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';

import type { FontFamily, Tokens } from './tokens';

export type Weight = 400 | 500 | 600 | 700 | 800;

/** Everything the app can ask for, keyed by the name expo-font registers. */
export const FONT_ASSETS = {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} as const;

type RegisteredName = keyof typeof FONT_ASSETS;

const WEIGHT_TABLE: Record<FontFamily, Partial<Record<Weight, RegisteredName>>> = {
  SpaceGrotesk: {
    500: 'SpaceGrotesk_500Medium',
    600: 'SpaceGrotesk_600SemiBold',
    700: 'SpaceGrotesk_700Bold',
  },
  IBMPlexSans: {
    400: 'IBMPlexSans_400Regular',
    500: 'IBMPlexSans_500Medium',
    600: 'IBMPlexSans_600SemiBold',
    700: 'IBMPlexSans_700Bold',
  },
  Fraunces: {
    500: 'Fraunces_500Medium',
    600: 'Fraunces_600SemiBold',
    700: 'Fraunces_700Bold',
  },
  Figtree: {
    400: 'Figtree_400Regular',
    500: 'Figtree_500Medium',
    600: 'Figtree_600SemiBold',
    700: 'Figtree_700Bold',
    800: 'Figtree_800ExtraBold',
  },
};

const WEIGHTS: Weight[] = [400, 500, 600, 700, 800];

/** Registered family name for a role and weight, falling to the nearest weight the family ships. */
export function fontFor(tokens: Tokens, role: 'display' | 'body', weight: Weight): string {
  const family = tokens.fonts[role];
  const table = WEIGHT_TABLE[family];
  const exact = table[weight];
  if (exact) return exact;
  const available = WEIGHTS.filter((w) => table[w] !== undefined);
  const nearest = available.reduce((best, w) =>
    Math.abs(w - weight) < Math.abs(best - weight) ? w : best,
  );
  return table[nearest] as string;
}

/** Loads every font the three looks use. Resolves once, before the splash hides. */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(FONT_ASSETS);
}
