import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { getKv, setKv } from '@/db/repo';

import { DEFAULT_LOOK, LOOKS, TOKENS, type Look, type Tokens } from './tokens';

type LookContextValue = {
  look: Look;
  tokens: Tokens;
  setLook: (look: Look) => void;
};

const LookContext = createContext<LookContextValue | null>(null);

function savedLook(): Look {
  try {
    const v = getKv('look');
    return v && (LOOKS as readonly string[]).includes(v) ? (v as Look) : DEFAULT_LOOK;
  } catch {
    return DEFAULT_LOOK;
  }
}

/** Holds the current look (persisted on the phone) and hands out its tokens. */
export function LookProvider({ children }: { children: ReactNode }) {
  const [look, setLookState] = useState<Look>(savedLook);
  const setLook = useCallback((next: Look) => {
    setLookState(next);
    try {
      setKv('look', next);
    } catch {}
  }, []);
  const value = useMemo<LookContextValue>(() => ({ look, tokens: TOKENS[look], setLook }), [look, setLook]);
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useLook(): LookContextValue {
  const ctx = useContext(LookContext);
  if (!ctx) throw new Error('useLook must be used inside <LookProvider>');
  return ctx;
}

export function useTokens(): Tokens {
  return useLook().tokens;
}
