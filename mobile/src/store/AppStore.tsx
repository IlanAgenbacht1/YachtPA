/**
 * App state for the demo flows: voyage START → live → STOP → summary → confirm,
 * and log entry: idle → recording → AI draft → confirm.
 *
 * The voyage numbers come from a simulated feed (one "minute" every 600 ms)
 * so the flow can be exercised on any phone today. `startVoyage` / `stopVoyage`
 * are the seam where the background-GPS spike plugs in: the feed will become
 * expo-location fixes and the maths moves to the computation rules in
 * docs/SCOPE.md §9.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { experience, passage, simStart, transcript } from '@/data/sample';

export type LiveVoyage = {
  from: string;
  to: string;
  startMin: number;
  headingDeg: number;
  elapsedMin: number;
  nm: number;
  speed: number;
  maxSpeed: number;
  speedSum: number;
  speedN: number;
};

export type VoyageSummary = {
  from: string;
  to: string;
  startMin: number;
  endMin: number;
  nm: number;
  durationMin: number;
  avgSpeed: number;
  maxSpeed: number;
  nightMin: number;
};

export type LogPhase = 'idle' | 'rec' | 'draft';

export type Totals = { nm: number; hours: number; nightHours: number };

type State = {
  voyage: LiveVoyage | null;
  summary: VoyageSummary | null;
  totals: Totals;
  loggedToday: boolean;
  logPhase: LogPhase;
  transcriptWords: number;
  toast: string;
};

type Actions = {
  startVoyage: () => void;
  stopVoyage: () => void;
  confirmVoyage: () => number;
  startRecording: () => void;
  resetLog: () => void;
  confirmLog: () => void;
  flash: (msg: string) => void;
  soon: () => void;
};

export type AppStore = State & Actions;

const Ctx = createContext<AppStore | null>(null);

const WORDS = transcript.split(' ');
const TICK_MS = 600;
const WORD_MS = 130;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [voyage, setVoyage] = useState<LiveVoyage | null>(null);
  const [summary, setSummary] = useState<VoyageSummary | null>(null);
  const [totals, setTotals] = useState<Totals>({
    nm: experience.totalNm,
    hours: experience.hoursUnderway,
    nightHours: experience.nightHours,
  });
  const [loggedToday, setLoggedToday] = useState(false);
  const [logPhase, setLogPhase] = useState<LogPhase>('idle');
  const [transcriptWords, setTranscriptWords] = useState(0);
  const [toast, setToast] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulated position feed while a voyage is live.
  useEffect(() => {
    if (!voyage) return;
    const id = setInterval(() => {
      setVoyage((v) => {
        if (!v) return v;
        const tick = v.speedN + 1;
        const speed = 9.6 + 2.2 * Math.sin(tick / 2.4);
        return {
          ...v,
          elapsedMin: v.elapsedMin + 1,
          nm: v.nm + speed / 60,
          speed,
          maxSpeed: Math.max(v.maxSpeed, speed),
          speedSum: v.speedSum + speed,
          speedN: tick,
        };
      });
    }, TICK_MS);
    return () => clearInterval(id);
    // Only the presence of a voyage matters here, not its ticking fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyage !== null]);

  // Word-by-word transcript while "listening", then hand over to the draft.
  useEffect(() => {
    if (logPhase !== 'rec') return;
    const id = setInterval(() => {
      setTranscriptWords((w) => {
        if (w + 1 >= WORDS.length) {
          clearInterval(id);
          draftTimer.current = setTimeout(() => setLogPhase('draft'), 700);
          return WORDS.length;
        }
        return w + 1;
      });
    }, WORD_MS);
    return () => {
      clearInterval(id);
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [logPhase]);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const soon = useCallback(() => flash('Not built yet'), [flash]);

  const startVoyage = useCallback(() => {
    setVoyage({
      from: passage.from,
      to: passage.to,
      startMin: passage.startMin,
      headingDeg: passage.headingDeg,
      elapsedMin: simStart.elapsedMin,
      nm: simStart.nm,
      speed: simStart.speed,
      maxSpeed: simStart.maxSpeed,
      speedSum: 0,
      speedN: 0,
    });
  }, []);

  const stopVoyage = useCallback(() => {
    setVoyage((v) => {
      if (!v) return v;
      const avg = v.speedN ? v.speedSum / v.speedN : v.speed;
      setSummary({
        from: v.from,
        to: v.to,
        startMin: v.startMin,
        endMin: v.startMin + v.elapsedMin,
        nm: v.nm,
        durationMin: v.elapsedMin,
        avgSpeed: avg,
        maxSpeed: v.maxSpeed,
        nightMin: 0,
      });
      return null;
    });
  }, []);

  const confirmVoyage = useCallback((): number => {
    let added = 0;
    setSummary((s) => {
      if (!s) return s;
      added = Math.round(s.nm);
      setTotals((t) => ({ ...t, nm: t.nm + added, hours: t.hours + Math.round(s.durationMin / 60) }));
      return null;
    });
    return added;
  }, []);

  const startRecording = useCallback(() => {
    setTranscriptWords(0);
    setLogPhase('rec');
  }, []);

  const resetLog = useCallback(() => {
    setTranscriptWords(0);
    setLogPhase('idle');
  }, []);

  const confirmLog = useCallback(() => {
    setLoggedToday(true);
    setLogPhase('idle');
    setTranscriptWords(0);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (draftTimer.current) clearTimeout(draftTimer.current);
    },
    [],
  );

  const value = useMemo<AppStore>(
    () => ({
      voyage,
      summary,
      totals,
      loggedToday,
      logPhase,
      transcriptWords,
      toast,
      startVoyage,
      stopVoyage,
      confirmVoyage,
      startRecording,
      resetLog,
      confirmLog,
      flash,
      soon,
    }),
    [voyage, summary, totals, loggedToday, logPhase, transcriptWords, toast, startVoyage, stopVoyage, confirmVoyage, startRecording, resetLog, confirmLog, flash, soon],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}

/** The transcript as far as it has been "heard". */
export function transcriptSoFar(words: number): string {
  return WORDS.slice(0, words).join(' ');
}
