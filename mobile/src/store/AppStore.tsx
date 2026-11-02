/**
 * App state that outlives a screen: the current yacht, the live voyage and the
 * toast. Everything durable lives in SQLite (`@/db/repo`); screens read it
 * with `useQuery`, which re-runs whenever `bump()` signals a write.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';

import * as repo from '@/db/repo';
import { onboard as saveOnboarding, type Current } from '@/db/repo';
import { summarise, type Fix, type TrackSummary } from '@/domain/track';
import { placeName, startGps, startSim, type FeedSource, type Stop } from '@/location/feed';

type OnboardInput = Parameters<typeof saveOnboarding>[0];

export type LiveVoyage = {
  id: string;
  startedAt: number;
  source: FeedSource;
  fromName: string | null;
  fixes: Fix[];
  track: TrackSummary;
  nm: number;
  elapsedMin: number;
  speed: number;
};

type Actions = {
  refresh: () => Promise<void>;
  bump: () => void;
  onboard: (input: OnboardInput) => Promise<void>;
  startVoyage: () => Promise<boolean>;
  /** Stops tracking and returns the id of the draft voyage to confirm. */
  stopVoyage: () => Promise<string | null>;
  setSimulate: (on: boolean) => void;
  flash: (msg: string) => void;
  soon: () => void;
};

type State = {
  ready: boolean;
  current: Current | null;
  voyage: LiveVoyage | null;
  simulate: boolean;
  rev: number;
  toast: string;
};

export type AppStore = State & Actions;

const Ctx = createContext<AppStore | null>(null);
const KEEP_AWAKE_TAG = 'voyage';

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<Current | null>(null);
  const [live, setLive] = useState<{ id: string; startedAt: number; source: FeedSource; fromName: string | null; fixes: Fix[] } | null>(null);
  const [simulate, setSimulateState] = useState(false);
  const [rev, setRev] = useState(0);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const feedStop = useRef<Stop | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = useCallback(() => setRev((r) => r + 1), []);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  const soon = useCallback(() => flash('Not built yet'), [flash]);

  const refresh = useCallback(async () => {
    setCurrent(await repo.getCurrent());
    bump();
  }, [bump]);

  /** Appends a fix in memory and on disk. */
  const onFix = useCallback((voyageId: string, f: Fix) => {
    setLive((v) => (v && v.id === voyageId ? { ...v, fixes: [...v.fixes, f] } : v));
    repo.addFix(voyageId, f).catch(() => {});
  }, []);

  const startFeed = useCallback(
    async (v: { id: string; startedAt: number; source: FeedSource; fixes: Fix[] }) => {
      feedStop.current?.();
      if (v.source === 'sim') {
        const from = await repo.lastKnownPosition();
        feedStop.current = startSim((f) => onFix(v.id, f), from, v.startedAt, v.fixes[v.fixes.length - 1]);
      } else {
        feedStop.current = await startGps((f) => onFix(v.id, f));
        activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
      }
    },
    [onFix],
  );

  const stopFeed = useCallback(() => {
    feedStop.current?.();
    feedStop.current = null;
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, []);

  // Boot: open the database, load the yacht, settings, and resume a voyage left running.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, sim, lv] = await Promise.all([repo.getCurrent(), repo.getSetting('simulate'), repo.getLiveVoyage()]);
        if (cancelled) return;
        setCurrent(c);
        setSimulateState(sim === '1');
        if (lv) {
          const fixes = await repo.getTrack(lv.id);
          const v = { id: lv.id, startedAt: lv.startedAt, source: lv.source === 'sim' ? ('sim' as const) : ('gps' as const), fromName: lv.fromName, fixes };
          setLive(v);
          startFeed(v).catch((e: Error) => flash(e.message));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startFeed, flash]);

  // A one-second clock while live, for elapsed time.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      stopFeed();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [stopFeed],
  );

  const onboard = useCallback(
    async (input: OnboardInput) => {
      await saveOnboarding(input);
      await refresh();
    },
    [refresh],
  );

  const startVoyage = useCallback(async (): Promise<boolean> => {
    if (!current || live) return !!live;
    const source: FeedSource = simulate ? 'sim' : 'gps';
    const startedAt = Date.now();
    const id = await repo.startVoyage(current.engagement.id, startedAt, source);
    const v = { id, startedAt, source, fromName: null, fixes: [] as Fix[] };
    setLive(v);
    try {
      await startFeed(v);
      return true;
    } catch (e) {
      setLive(null);
      await repo.deleteVoyage(id);
      flash((e as Error).message);
      return false;
    }
  }, [current, live, simulate, startFeed, flash]);

  const stopVoyage = useCallback(async (): Promise<string | null> => {
    if (!live) return null;
    stopFeed();
    const fixes = await repo.getTrack(live.id);
    const last = fixes[fixes.length - 1];
    const endedAt = live.source === 'sim' && last ? last.ts : Date.now();
    const s = summarise(fixes, { startedAt: live.startedAt, endedAt });
    const [from, to] = await Promise.all([s.first ? placeName(s.first) : null, s.last ? placeName(s.last) : null]);
    await repo.stopVoyage(live.id, endedAt, s, { from, to });
    const id = live.id;
    setLive(null);
    bump();
    return id;
  }, [live, stopFeed, bump]);

  const setSimulate = useCallback((on: boolean) => {
    setSimulateState(on);
    repo.setSetting('simulate', on ? '1' : '0').catch(() => {});
  }, []);

  const voyage = useMemo<LiveVoyage | null>(() => {
    if (!live) return null;
    const last = live.fixes[live.fixes.length - 1];
    const clock = live.source === 'sim' ? (last?.ts ?? live.startedAt) : now;
    const track = summarise(live.fixes, { startedAt: live.startedAt, endedAt: clock });
    return { ...live, track, nm: track.distanceNm, elapsedMin: track.durationMin, speed: track.currentKn };
  }, [live, now]);

  const value = useMemo<AppStore>(
    () => ({ ready, current, voyage, simulate, rev, toast, refresh, bump, onboard, startVoyage, stopVoyage, setSimulate, flash, soon }),
    [ready, current, voyage, simulate, rev, toast, refresh, bump, onboard, startVoyage, stopVoyage, setSimulate, flash, soon],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}

/**
 * Runs an async read and re-runs it after every write (`bump`) or when `deps`
 * change. Returns undefined until the first result arrives.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: DependencyList = []): T | undefined {
  const { rev } = useAppStore();
  const [data, setData] = useState<T | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fn().then((d) => live && setData(d)).catch(() => {});
    return () => {
      live = false;
    };
  }, [rev, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}
