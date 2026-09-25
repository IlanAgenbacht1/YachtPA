/**
 * App state. Voyages are real: rows in SQLite fed by the background location
 * task (or the simulator on web and in testing). The log-entry flow is still
 * the scripted demo until the voice spike lands.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { transcript } from '@/data/sample';
import {
  ensureEngagement,
  getDraftVoyage,
  getLiveSnapshot,
  getLiveVoyage,
  getTotals,
  listVoyages,
  setVoyageStatus,
  startVoyage as dbStartVoyage,
  stopVoyage as dbStopVoyage,
  wipeAllData,
  type Engagement,
  type LiveSnapshot,
  type Totals,
  type Voyage,
  type VoyageSource,
} from '@/db';
import { confirm } from '@/lib/confirm';
import {
  getTrackingPermission,
  requestTrackingPermission,
  startSimulation,
  startTracking,
  stopSimulation,
  stopTracking,
  type PermissionOutcome,
} from '@/location';

export type LogPhase = 'idle' | 'rec' | 'draft';

/** Until "add current yacht" exists, the first launch gets the demo engagement. */
const SEED_ENGAGEMENT = {
  vessel: { name: 'M/Y Shadow', type: 'motor' as const, loaM: 27, flag: 'Cayman Islands' },
  position: 'Deckhand',
  startedOn: '2025-03-01',
};

type State = {
  ready: boolean;
  engagement: Engagement | null;
  /** Last place the app knows about: end of the last voyage. */
  lastPlace: string | null;
  live: LiveSnapshot | null;
  draft: Voyage | null;
  totals: Totals;
  permission: PermissionOutcome | null;
  loggedToday: boolean;
  logPhase: LogPhase;
  transcriptWords: number;
  toast: string;
};

type Actions = {
  /** Returns true when a voyage started. */
  startVoyage: (source?: VoyageSource) => Promise<boolean>;
  stopVoyage: () => Promise<Voyage | null>;
  /** Returns the NM added to the record. */
  confirmVoyage: () => Promise<number>;
  discardVoyage: () => Promise<void>;
  wipeData: () => Promise<void>;
  refresh: () => Promise<void>;
  startRecording: () => void;
  resetLog: () => void;
  confirmLog: () => void;
  flash: (msg: string) => void;
  soon: () => void;
};

export type AppStore = State & Actions;

const Ctx = createContext<AppStore | null>(null);

const WORDS = transcript.split(' ');
const WORD_MS = 130;
const LIVE_POLL_MS = 1000;
const EMPTY_TOTALS: Totals = { nm: 0, underwayMin: 0, nightMin: 0, voyages: 0 };

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [lastPlace, setLastPlace] = useState<string | null>(null);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [draft, setDraft] = useState<Voyage | null>(null);
  const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
  const [permission, setPermission] = useState<PermissionOutcome | null>(null);
  const [loggedToday, setLoggedToday] = useState(false);
  const [logPhase, setLogPhase] = useState<LogPhase>('idle');
  const [transcriptWords, setTranscriptWords] = useState(0);
  const [toast, setToast] = useState('');

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveId = useRef<string | null>(null);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const soon = useCallback(() => flash('Not built yet'), [flash]);

  const refreshTotals = useCallback(async () => {
    setTotals(await getTotals());
    const recent = await listVoyages(5);
    const withEnd = recent.find((v) => v.end?.place);
    setLastPlace(withEnd?.end?.place ?? null);
  }, []);

  const pollLive = useCallback(async () => {
    const id = liveId.current;
    if (!id) return;
    const snap = await getLiveSnapshot(id);
    if (liveId.current !== id) return;
    if (!snap || snap.voyage.status !== 'live') {
      liveId.current = null;
      setLive(null);
      return;
    }
    setLive(snap);
  }, []);

  /** Rebuilds state from the database; also resumes tracking for a voyage left open by a previous launch. */
  const refresh = useCallback(async () => {
    const eng = await ensureEngagement(SEED_ENGAGEMENT);
    setEngagement(eng);
    const open = await getLiveVoyage();
    if (open) {
      liveId.current = open.id;
      if (open.source === 'gps') await startTracking().catch((e) => console.warn('resume tracking failed', e));
      else if (open.source === 'sim') startSimulation(open.id, open.startedAt);
      await pollLive();
    } else {
      liveId.current = null;
      setLive(null);
    }
    setDraft(await getDraftVoyage());
    await refreshTotals();
    setPermission(await getTrackingPermission());
  }, [pollLive, refreshTotals]);

  // Load from the database once; state is set from the async callbacks, never synchronously.
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await refresh();
      } catch (e) {
        console.error('app init failed', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    queueMicrotask(() => void boot());
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Poll the live voyage while there is one, and after the app comes to the foreground.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => void pollLive(), LIVE_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void pollLive();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [live !== null, pollLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const startVoyage = useCallback(
    async (requested?: VoyageSource): Promise<boolean> => {
      if (!engagement || liveId.current) return false;
      const source: VoyageSource = Platform.OS === 'web' ? 'sim' : (requested ?? 'gps');
      if (source === 'gps') {
        let perm = await getTrackingPermission();
        if (perm !== 'always') {
          const ok = await confirm(
            'Track this voyage?',
            'YachtPA records your position from now until you tap Stop voyage, including while your phone is locked, to log your sea miles. Choose "Allow all the time" on the next screen. Nothing is tracked outside a voyage.',
            'Continue',
            'Not now',
          );
          if (!ok) return false;
          perm = await requestTrackingPermission();
        }
        setPermission(perm);
        if (perm === 'denied' || perm === 'unavailable') {
          flash('Location permission is needed to track a voyage');
          return false;
        }
        if (perm === 'while-in-use') flash('Tracking only while the app is open. Allow location all the time in Settings for background tracking.');
      }
      const v = await dbStartVoyage(engagement.id, source);
      liveId.current = v.id;
      try {
        if (source === 'gps') await startTracking();
        else startSimulation(v.id, v.startedAt);
      } catch (e) {
        console.warn('start tracking failed', e);
        liveId.current = null;
        await setVoyageStatus(v.id, 'discarded');
        flash('Tracking could not start on this device');
        return false;
      }
      setLive(await getLiveSnapshot(v.id));
      return true;
    },
    [engagement, flash],
  );

  const stopVoyage = useCallback(async (): Promise<Voyage | null> => {
    const id = liveId.current;
    if (!id) return null;
    liveId.current = null;
    stopSimulation(id);
    await stopTracking().catch((e) => console.warn('stop tracking failed', e));
    const v = await dbStopVoyage(id);
    setLive(null);
    setDraft(v);
    return v;
  }, []);

  const confirmVoyage = useCallback(async (): Promise<number> => {
    if (!draft) return 0;
    await setVoyageStatus(draft.id, 'confirmed');
    setDraft(null);
    await refreshTotals();
    return Math.round(draft.nm);
  }, [draft, refreshTotals]);

  const discardVoyage = useCallback(async () => {
    if (!draft) return;
    await setVoyageStatus(draft.id, 'discarded');
    setDraft(null);
  }, [draft]);

  const wipeData = useCallback(async () => {
    const id = liveId.current;
    if (id) {
      liveId.current = null;
      stopSimulation(id);
      await stopTracking().catch(() => {});
    }
    await wipeAllData();
    setLive(null);
    setDraft(null);
    setLoggedToday(false);
    await refresh();
  }, [refresh]);

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
      ready,
      engagement,
      lastPlace,
      live,
      draft,
      totals,
      permission,
      loggedToday,
      logPhase,
      transcriptWords,
      toast,
      startVoyage,
      stopVoyage,
      confirmVoyage,
      discardVoyage,
      wipeData,
      refresh,
      startRecording,
      resetLog,
      confirmLog,
      flash,
      soon,
    }),
    [ready, engagement, lastPlace, live, draft, totals, permission, loggedToday, logPhase, transcriptWords, toast, startVoyage, stopVoyage, confirmVoyage, discardVoyage, wipeData, refresh, startRecording, resetLog, confirmLog, flash, soon],
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
