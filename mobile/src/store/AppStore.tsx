/**
 * App state that outlives a screen: the current yacht, the live voyage and the
 * toast. Everything durable lives in SQLite (`@/db/repo`); screens read it
 * with `useQuery`, which re-runs whenever `bump()` signals a write.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Alert, AppState, Linking } from 'react-native';
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
import { trackingGaps } from '@/domain/report';
import { summarise, type Fix, type TrackSummary } from '@/domain/track';
import { setBackgroundListener } from '@/location/background';
import { placeName, startGps, startSim, type FeedSource, type Stop } from '@/location/feed';
import { ensureNotificationPermission, notificationsAllowed, rescheduleReminders } from '@/lib/reminders';
import { readBattery, type BatteryReading } from '@/lib/battery';
import { log } from '@/lib/diag';
import { trackingStatus } from '@/location/permissions';
import { batteryPerHour } from '@/telemetry/engine';
import { flushTelemetry, track as trackEvent } from '@/telemetry';
import { pushChanges } from '@/sync/backup';
import { cloudConfigured } from '@/sync/supabase';

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
  /** gps only: whether tracking survives the phone locking */
  mode: 'background' | 'foreground' | null;
};

type Actions = {
  refresh: () => Promise<void>;
  bump: () => void;
  onboard: (input: OnboardInput) => Promise<void>;
  startVoyage: () => Promise<boolean>;
  /** Stops tracking and returns the id of the draft voyage to confirm. */
  stopVoyage: () => Promise<string | null>;
  setSimulate: (on: boolean) => void;
  setMicOn: (on: boolean) => void;
  setDevTools: (on: boolean) => void;
  flash: (msg: string) => void;
  soon: () => void;
};

type State = {
  ready: boolean;
  current: Current | null;
  voyage: LiveVoyage | null;
  /** simulated GPS: only ever on while testing tools are unlocked */
  simulate: boolean;
  /** the in-app mic on the Log screen; a tester can switch it off and type */
  micOn: boolean;
  /** hidden testing tools (Simulate GPS) unlocked from Profile */
  devTools: boolean;
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
  const [simulateSetting, setSimulateState] = useState(false);
  const [micOn, setMicOnState] = useState(true);
  const [devTools, setDevToolsState] = useState(false);
  // Testers never see Simulate GPS, so it can never be left on by accident outside testing tools.
  const simulate = simulateSetting && devTools;
  const [mode, setMode] = useState<'background' | 'foreground' | null>(null);
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

  /** Appends a fix in memory only (the background task has already saved it). */
  const showFix = useCallback((voyageId: string, f: Fix) => {
    setLive((v) => (v && v.id === voyageId ? { ...v, fixes: [...v.fixes, f] } : v));
  }, []);

  /** Appends a fix in memory and on disk. */
  const onFix = useCallback(
    (voyageId: string, f: Fix) => {
      showFix(voyageId, f);
      repo.addFix(voyageId, f).catch(() => {});
    },
    [showFix],
  );

  useEffect(() => {
    setBackgroundListener(showFix);
    return () => setBackgroundListener(null);
  }, [showFix]);

  const startFeed = useCallback(
    async (v: { id: string; startedAt: number; source: FeedSource; fixes: Fix[] }): Promise<'sim' | 'background' | 'foreground'> => {
      feedStop.current?.();
      if (v.source === 'sim') {
        const from = await repo.lastKnownPosition();
        feedStop.current = startSim((f) => onFix(v.id, f), from, v.startedAt, v.fixes[v.fixes.length - 1]);
        return 'sim';
      } else {
        const gps = await startGps(v.id, (f) => onFix(v.id, f));
        feedStop.current = gps.stop;
        setMode(gps.mode);
        log(gps.mode === 'background' ? 'info' : 'warn', 'tracking', gps.mode === 'background' ? 'Logging with the phone locked' : 'Logging only while the app is open (no "all the time" location)');
        // Foreground tracking stops when the screen locks, so keep it on.
        if (gps.mode === 'foreground') activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
        return gps.mode;
      }
    },
    [onFix],
  );

  const stopFeed = useCallback(() => {
    feedStop.current?.();
    feedStop.current = null;
    setMode(null);
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, []);

  // Boot: open the database, load the yacht, settings, and resume a voyage left running.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, sim, lv, micOff, dev] = await Promise.all([
          repo.getCurrent(),
          repo.getSetting('simulate'),
          repo.getLiveVoyage(),
          repo.getSetting('mic_off'),
          repo.getSetting('dev_tools'),
        ]);
        if (cancelled) return;
        setCurrent(c);
        setSimulateState(sim === '1');
        setMicOnState(micOff !== '1');
        setDevToolsState(dev === '1');
        if (lv) {
          const fixes = await repo.getTrack(lv.id);
          const v = { id: lv.id, startedAt: lv.startedAt, source: lv.source === 'sim' ? ('sim' as const) : ('gps' as const), fromName: lv.fromName, fixes };
          // The app was closed mid-voyage (swiped away, or the phone stopped it).
          const lastTs = fixes[fixes.length - 1]?.ts ?? lv.startedAt;
          trackEvent('voyage_resumed', { source: v.source, minutesSinceLastPosition: Math.round((Date.now() - lastTs) / 60000) });
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

  // Coming back to the app: reload the track from disk in case fixes arrived while the UI slept.
  const liveId = live?.id;
  useEffect(() => {
    if (!liveId) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      repo.getTrack(liveId).then((fixes) => setLive((v) => (v && v.id === liveId ? { ...v, fixes } : v)));
    });
    return () => sub.remove();
  }, [liveId]);

  // Once per app open: how this phone is set up, then upload whatever waited for signal.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const [t, notifications] = await Promise.all([trackingStatus(), notificationsAllowed()]);
      trackEvent('app_open', {});
      trackEvent('setup_status', { services: t.services, allowed: t.allowed, precise: t.precise, always: t.always, canAlways: t.canAlways, notifications });
    })().catch(() => {});
    const id = setTimeout(() => flushTelemetry(), 3000);
    return () => clearTimeout(id);
  }, [ready]);

  // Reminders follow the data: rebuild after every write and when a voyage starts or stops.
  useEffect(() => {
    if (ready) rescheduleReminders().catch((e) => log('warn', 'reminders', 'Could not schedule reminders', e));
  }, [ready, rev, liveId]);

  // Cloud backup: push queued changes a few seconds after writes settle, and when the app comes back.
  useEffect(() => {
    if (!ready || !cloudConfigured) return;
    const id = setTimeout(() => {
      pushChanges().catch((e) => log('warn', 'backup', 'Upload failed, will retry', e));
      flushTelemetry();
    }, 4000);
    return () => clearTimeout(id);
  }, [ready, rev]);
  useEffect(() => {
    if (!cloudConfigured) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        pushChanges().catch((e) => log('warn', 'backup', 'Upload failed, will retry', e));
        flushTelemetry();
      }
    });
    return () => sub.remove();
  }, []);

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
    await ensureNotificationPermission().catch(() => false);
    const source: FeedSource = simulate ? 'sim' : 'gps';
    const startedAt = Date.now();
    const id = await repo.startVoyage(current.engagement.id, startedAt, source);
    log('info', 'voyage', `Started (${source === 'sim' ? 'pretend GPS' : 'GPS'})`);
    const v = { id, startedAt, source, fromName: null, fixes: [] as Fix[] };
    setLive(v);
    try {
      const feedMode = await startFeed(v);
      const battery = await readBattery();
      repo.setSetting('battery_start', JSON.stringify({ id, battery })).catch(() => {});
      trackEvent('voyage_start', { source, mode: feedMode, battery: battery?.level ?? null, charging: battery?.charging ?? null, lowPower: battery?.lowPower ?? null });
      return true;
    } catch (e) {
      setLive(null);
      await repo.deleteVoyage(id);
      const err = e as Error & { openSettings?: boolean };
      log('warn', 'voyage', `Could not start: ${err.message}`);
      // Refused permissions are fixed in the phone's Settings; offer the way there.
      if (err.openSettings) {
        Alert.alert('Location is needed', err.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
        ]);
      } else flash(err.message);
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
    const gaps = live.source === 'gps' ? trackingGaps(fixes) : [];
    log(
      gaps.length ? 'warn' : 'info',
      'voyage',
      `Stopped: ${s.distanceNm.toFixed(1)} NM, ${Math.round(s.durationMin)} min, ${fixes.length} positions (${s.kept} usable)${gaps.length ? `, ${gaps.length} gap(s), longest ${Math.max(...gaps.map((g) => g.minutes))} min` : ''}`,
      gaps.length ? gaps.map((g) => `${new Date(g.from).toISOString().slice(11, 16)}–${new Date(g.to).toISOString().slice(11, 16)} UTC ${g.minutes} min`).join(', ') : undefined,
    );
    // Usage metrics: how well tracking held up, and what it cost in battery. No positions or place names.
    const endBattery = await readBattery();
    let startBattery: BatteryReading | null = null;
    try {
      const saved = JSON.parse((await repo.getSetting('battery_start')) ?? 'null') as { id: string; battery: BatteryReading | null } | null;
      if (saved?.id === live.id) startBattery = saved.battery;
    } catch {
      startBattery = null;
    }
    const hours = s.durationMin / 60;
    trackEvent('voyage_stop', {
      source: live.source,
      mode: live.source === 'sim' ? 'sim' : mode,
      nm: Math.round(s.distanceNm * 10) / 10,
      durationMin: Math.round(s.durationMin),
      underwayMin: Math.round(s.underwayMin),
      nightMin: Math.round(s.nightMin),
      overnight: s.overnight,
      positions: fixes.length,
      usable: s.kept,
      positionsPerHour: hours > 0 ? Math.round(fixes.length / hours) : null,
      gaps: gaps.length,
      longestGapMin: gaps.length ? Math.max(...gaps.map((g) => g.minutes)) : 0,
      gapMinutes: gaps.reduce((t, g) => t + g.minutes, 0),
      batteryStart: startBattery?.level ?? null,
      batteryEnd: endBattery?.level ?? null,
      batteryPerHour: batteryPerHour(startBattery, endBattery, s.durationMin),
      lowPower: endBattery?.lowPower ?? null,
    });
    flushTelemetry();
    const [from, to] = await Promise.all([s.first ? placeName(s.first) : null, s.last ? placeName(s.last) : null]);
    await repo.stopVoyage(live.id, endedAt, s, { from, to });
    const id = live.id;
    setLive(null);
    bump();
    return id;
  }, [live, stopFeed, bump, mode]);

  const setMicOn = useCallback((on: boolean) => {
    setMicOnState(on);
    repo.setSetting('mic_off', on ? '0' : '1').catch(() => {});
  }, []);

  const setDevTools = useCallback((on: boolean) => {
    setDevToolsState(on);
    repo.setSetting('dev_tools', on ? '1' : '0').catch(() => {});
  }, []);

  const setSimulate = useCallback((on: boolean) => {
    setSimulateState(on);
    repo.setSetting('simulate', on ? '1' : '0').catch(() => {});
  }, []);

  const voyage = useMemo<LiveVoyage | null>(() => {
    if (!live) return null;
    const last = live.fixes[live.fixes.length - 1];
    const clock = live.source === 'sim' ? (last?.ts ?? live.startedAt) : now;
    const track = summarise(live.fixes, { startedAt: live.startedAt, endedAt: clock });
    return { ...live, track, nm: track.distanceNm, elapsedMin: track.durationMin, speed: track.currentKn, mode };
  }, [live, now, mode]);

  const value = useMemo<AppStore>(
    () => ({ ready, current, voyage, simulate, micOn, devTools, rev, toast, refresh, bump, onboard, startVoyage, stopVoyage, setSimulate, setMicOn, setDevTools, flash, soon }),
    [ready, current, voyage, simulate, micOn, devTools, rev, toast, refresh, bump, onboard, startVoyage, stopVoyage, setSimulate, setMicOn, setDevTools, flash, soon],
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
