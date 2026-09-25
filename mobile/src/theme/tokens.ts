/**
 * Design tokens for the Deck build (design/prototype/Deck.dc.html).
 *
 * One object per look. The night look is the same token mechanism, not a
 * separate theme: everything on screen reads a token, nothing reads a colour.
 * Values are copied verbatim from the prototype's `.root` / `.root.<look>`
 * CSS custom-property blocks so the app and the prototype stay in step.
 */

export type Look = 'horizon' | 'sailcloth' | 'night';

export const LOOKS: readonly Look[] = ['horizon', 'sailcloth', 'night'] as const;

export type HeroGradient = {
  /** Vertical linear gradient, top to bottom. */
  from: string;
  to: string;
  /** Optional radial glow anchored at the bottom centre (Horizon's regatta-orange haze). */
  glow?: { color: string; opacity: number };
};

export type Tokens = {
  look: Look;
  colors: {
    bg: string;
    heroFg: string;
    heroMuted: string;
    sheet: string;
    fg: string;
    muted: string;
    card: string;
    cardBorder: string;
    accent: string;
    accentFg: string;
    brass: string;
    ok: string;
    warn: string;
    danger: string;
    track: string;
    chart: string;
    tab: string;
    tabFg: string;
    tabActive: string;
    btn2: string;
    btn2Fg: string;
    btn2Border: string;
  };
  hero: HeroGradient;
  /** CSS box-shadow strings; RN 0.76+ renders these on every platform. */
  shadows: {
    card?: string;
    button?: string;
  };
  radius: {
    md: number;
    lg: number;
  };
  fonts: {
    display: FontFamily;
    body: FontFamily;
  };
  /** Swatches shown in the look switch pill. */
  swatches: Record<Look, { fill: string; border?: string }>;
  /** Whether the hero is dark (drives status-bar style and on-hero borders). */
  heroIsDark: boolean;
};

export type FontFamily = 'SpaceGrotesk' | 'IBMPlexSans' | 'Fraunces' | 'Figtree';

export const horizon: Tokens = {
  look: 'horizon',
  colors: {
    bg: '#F2F4F7',
    heroFg: '#FFFFFF',
    heroMuted: '#9FB6CA',
    sheet: '#F2F4F7',
    fg: '#0E1D31',
    muted: '#5A6A7A',
    card: '#FFFFFF',
    cardBorder: '#E0E6EC',
    accent: '#D2481F',
    accentFg: '#FFFFFF',
    brass: '#B4862A',
    ok: '#1E8C5C',
    warn: '#CF7A12',
    danger: '#B8391C',
    track: '#E0E6EC',
    chart: 'rgba(14,29,49,0.08)',
    tab: '#FFFFFF',
    tabFg: '#7A8794',
    tabActive: '#0E1D31',
    btn2: 'rgba(255,255,255,0.12)',
    btn2Fg: '#FFFFFF',
    btn2Border: 'rgba(255,255,255,0.26)',
  },
  hero: { from: '#07192B', to: '#0D2F4D', glow: { color: '#D64B23', opacity: 0.32 } },
  shadows: {
    card: '0 1px 2px rgba(14,29,49,0.04), 0 10px 28px rgba(14,29,49,0.06)',
    button: '0 12px 28px rgba(210,72,31,0.28), 0 2px 6px rgba(0,0,0,0.18)',
  },
  radius: { md: 16, lg: 22 },
  fonts: { display: 'SpaceGrotesk', body: 'IBMPlexSans' },
  swatches: {
    horizon: { fill: '#0D2F4D' },
    sailcloth: { fill: '#EEE7DC' },
    night: { fill: '#000000', border: '#FF453A' },
  },
  heroIsDark: true,
};

export const sailcloth: Tokens = {
  look: 'sailcloth',
  colors: {
    bg: '#EDE6DA',
    heroFg: '#101E30',
    heroMuted: '#5B6A79',
    sheet: '#F7F3EC',
    fg: '#101E30',
    muted: '#5B6A79',
    card: '#FFFFFF',
    cardBorder: '#E6DDCD',
    accent: '#0B6E78',
    accentFg: '#FFFFFF',
    brass: '#9C7422',
    ok: '#2C8A57',
    warn: '#BE7410',
    danger: '#C4402C',
    track: '#ECE5D8',
    chart: 'rgba(16,30,48,0.08)',
    tab: '#FFFFFF',
    tabFg: '#7A8794',
    tabActive: '#101E30',
    btn2: '#FFFFFF',
    btn2Fg: '#101E30',
    btn2Border: '#DDD3C2',
  },
  hero: { from: '#EEE7DC', to: '#E6DDCF' },
  shadows: {
    card: '0 1px 2px rgba(20,30,50,0.05), 0 10px 28px rgba(20,30,50,0.06)',
    button: '0 12px 28px rgba(11,110,120,0.22), 0 2px 6px rgba(20,30,50,0.10)',
  },
  radius: { md: 18, lg: 24 },
  fonts: { display: 'Fraunces', body: 'Figtree' },
  swatches: {
    horizon: { fill: '#0D2F4D' },
    sailcloth: { fill: '#EEE7DC' },
    night: { fill: '#000000', border: '#FF453A' },
  },
  heroIsDark: false,
};

/** Night watch: pure black, everything in red, to protect night vision. */
export const night: Tokens = {
  look: 'night',
  colors: {
    bg: '#000000',
    heroFg: '#FF453A',
    heroMuted: '#D93E34',
    sheet: '#000000',
    fg: '#FF453A',
    muted: '#D93E34',
    card: '#120404',
    cardBorder: '#3A0E0B',
    accent: '#FF453A',
    accentFg: '#000000',
    brass: '#FF453A',
    ok: '#FF453A',
    warn: '#FF453A',
    danger: '#FF453A',
    track: '#2A0A08',
    chart: '#2A0A08',
    tab: '#000000',
    tabFg: '#8A2A24',
    tabActive: '#FF453A',
    btn2: '#120404',
    btn2Fg: '#FF453A',
    btn2Border: '#3A0E0B',
  },
  hero: { from: '#000000', to: '#000000' },
  shadows: {},
  radius: { md: 16, lg: 22 },
  fonts: { display: 'SpaceGrotesk', body: 'IBMPlexSans' },
  swatches: {
    horizon: { fill: '#1C0806', border: '#FF453A' },
    sailcloth: { fill: '#5C1712', border: '#FF453A' },
    night: { fill: '#000000', border: '#FF453A' },
  },
  heroIsDark: true,
};

export const TOKENS: Record<Look, Tokens> = { horizon, sailcloth, night };

export const DEFAULT_LOOK: Look = 'horizon';
