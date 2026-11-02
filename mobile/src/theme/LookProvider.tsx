import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSetting, setSetting } from '@/db/repo';

import { DEFAULT_LOOK, TOKENS, type Look, type Tokens } from './tokens';

type LookContextValue = {
  look: Look;
  tokens: Tokens;
  setLook: (look: Look) => void;
};

const LookContext = createContext<LookContextValue | null>(null);

/** Holds the current look and hands out its tokens. The choice is saved on the device. */
export function LookProvider({ children, initial = DEFAULT_LOOK }: { children: ReactNode; initial?: Look }) {
  const [look, setLookState] = useState<Look>(initial);
  useEffect(() => {
    getSetting('look')
      .then((saved) => {
        if (saved && saved in TOKENS) setLookState(saved as Look);
      })
      .catch(() => {});
  }, []);
  const setLook = useCallback((next: Look) => {
    setLookState(next);
    setSetting('look', next).catch(() => {});
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
