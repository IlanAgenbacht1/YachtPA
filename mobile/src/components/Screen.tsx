import type { ReactNode } from 'react';

import { useTokens } from '@/theme';

import { Enter } from './motion';

/** Full-height screen container that fades in on mount. */
export function Screen({ children }: { children: ReactNode }) {
  const t = useTokens();
  return <Enter style={{ flex: 1, backgroundColor: t.colors.bg }}>{children}</Enter>;
}
