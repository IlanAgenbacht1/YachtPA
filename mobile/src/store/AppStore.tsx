/**
 * App state. Everything is loaded from SQLite into memory (a crew member's
 * records are small; track points stay on disk) and every action writes to
 * SQLite first, then reloads. Derived numbers come from src/domain.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import * as repo from '@/db/repo';
import { newId } from '@/db/db';
import { dayKey } from '@/domain/dates';
import { counts as docCounts } from '@/domain/documents';
import { experience, type Ctx, type Experience } from '@/domain/experience';
import { placeName } from '@/domain/places';
import { QUALIFICATIONS } from '@/domain/qualData';
import { evaluate, mainDiscipline, newlyMet, type QualProgress } from '@/domain/qualifications';
import { missedDays, voyageFlags } from '@/domain/sanity';
import { isSkipperPosition, type Doc, type Engagement, type LogEntry, type Profile, type Vessel, type Voyage } from '@/domain/types';
import { summarizeTrack, type TrackSummary } from '@/domain/voyage';
import { cancelStillUnderway, notifyNow, scheduleDocReminders, scheduleStillUnderway } from '@/lib/notify';
import { chooseMode, liveNow, resume, startTracking, stopTracking, trackingState, type TrackingMode } from '@/tracking/tracker';

export type Live = { voyage: Voyage; mode: TrackingMode; stats: TrackSummary; now: number; fixes: number };

type Data = {
  profile: Profile;
  vessels: Vessel[];
  engagements: Engagement[];
  voyages: Voyage[];
  entries: LogEntry[];
  docs: Doc[];
};

const EMPTY: Data = {
  profile: { name: '', nationality: '', homeCountry: '', email: '', phone: '', onboardedAt: null },
  vessels: [],
  engagements: [],
  voyages: [],
  entries: [],
  docs: [],
};

type Derived = {
  today: string;
  active: Engagement | null;
  activeVessel: Vessel | null;
  exp: Experience;
  quals: QualProgress[];
  docCounts: { ok: number; warn: number; danger: number };
  missed: number;
  lastPlace: string;
  loggedToday: LogEntry | null;
};

type Actions = {
  reload: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  saveVessel: (v: Parameters<typeof repo.upsertVessel>[0]) => Promise<string>;
  deleteVessel: (id: string) => Promise<boolean>;
  saveEngagement: (e: Parameters<typeof repo.upsertEngagement>[0]) => Promise<string>;
  deleteEngagement: (id: string) => Promise<boolean>;
  startVoyage: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  stopVoyage: () => Promise<string | null>;
  saveVoyage: (v: Voyage) => Promise<void>;
  confirmVoyage: (v: Voyage) => Promise<void>;
  deleteVoyage: (id: string) => Promise<void>;
  saveEntry: (e: Parameters<typeof repo.saveEntry>[0]) => Promise<string>;
  deleteEntry: (id: string) => Promise<void>;
  saveDoc: (d: Parameters<typeof repo.saveDoc>[0]) => Promise<string>;
  renewDoc: (oldId: string, d: Parameters<typeof repo.saveDoc>[0]) => Promise<string>;
  deleteDoc: (id: string) => Promise<void>;
  wipe: () => Promise<void>;
  setSimulatedGps: (on: boolean) => void;
  flash: (msg: string) => void;
};

export type AppStore = Data &
  Derived &
  Actions & { ready: boolean; live: Live | null; toast: string; simulatedGps: boolean };

const StoreCtx = createContext<AppStore | null>(null);

function qualsFor(ctx: Ctx, docs: Doc[], today: string): QualProgress[] {
  const d = mainDiscipline(ctx);
  return QUALIFICATIONS.map((q) => evaluate(q, d, ctx, docs, today));
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [toast, setToast] = useState('');
  const [simulatedGps, setSim] = useState(() => repo.getKv('simulated_gps') === '1');
  const [today, setToday] = useState(() => dayKey(Date.now()));
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(async (): Promise<Data> => {
    const next: Data = {
      profile: await repo.getProfile(),
      vessels: await repo.listVessels(),
      engagements: await repo.listEngagements(),
      voyages: await repo.listVoyages(),
      entries: await repo.listEntries(),
      docs: await repo.listDocs(),
    };
    setData(next);
    setToday(dayKey(Date.now()));
    return next;
  }, []);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  // Boot: load, resume a live voyage's feed, re-plan reminders.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await load();
      if (cancelled) return;
      setReady(true);
      const s = trackingState();
      if (s && d.voyages.some((v) => v.id === s.voyageId && v.endedAt === null)) await resume(s).catch(() => {});
      scheduleDocReminders(d.docs, dayKey(Date.now()));
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Live voyage: recompute from the stored track every couple of seconds.
  const liveVoyage = data.voyages.find((v) => v.endedAt === null) ?? null;
  useEffect(() => {
    if (!liveVoyage) return;
    let stop = false;
    const tickLive = async () => {
      const s = trackingState();
      const fixes = await repo.getTrack(liveVoyage.id);
      const now = liveNow(s);
      if (stop) return;
      setLive({ voyage: liveVoyage, mode: s?.mode ?? 'foreground', stats: summarizeTrack(fixes, liveVoyage.startedAt, now), now, fixes: fixes.length });
    };
    tickLive();
    const id = setInterval(tickLive, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [liveVoyage]);

  /* ---------- derived ---------- */

  const derived = useMemo<Derived>(() => {
    const ctx: Ctx = { vessels: data.vessels, engagements: data.engagements, voyages: data.voyages, entries: data.entries };
    const current = data.engagements.filter((e) => e.endDate === null || e.endDate >= today).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const active = current[0] ?? null;
    const lastEnded = data.voyages.find((v) => v.endedAt !== null && v.endPlace);
    return {
      today,
      active,
      activeVessel: active ? (data.vessels.find((v) => v.id === active.vesselId) ?? null) : null,
      exp: experience(ctx, today),
      quals: qualsFor(ctx, data.docs, today),
      docCounts: docCounts(data.docs, today),
      missed: missedDays(active, data.entries, data.voyages, today),
      lastPlace: lastEnded?.endPlace ?? data.vessels.find((v) => v.id === active?.vesselId)?.homePort ?? '',
      loggedToday: active ? (data.entries.find((e) => e.engagementId === active.id && e.date === today) ?? null) : null,
    };
  }, [data, today]);

  /* ---------- actions ---------- */

  const saveProfile = async (p: Profile) => {
    await repo.saveProfile(p);
    await load();
  };

  const finishOnboarding = async () => {
    const p = await repo.getProfile();
    await repo.saveProfile({ ...p, onboardedAt: Date.now() });
    await load();
  };

  const saveVessel = async (v: Parameters<typeof repo.upsertVessel>[0]) => {
    const id = await repo.upsertVessel(v);
    await load();
    return id;
  };

  const deleteVessel = async (id: string) => {
    const ok = await repo.deleteVessel(id);
    await load();
    return ok;
  };

  const saveEngagement = async (e: Parameters<typeof repo.upsertEngagement>[0]) => {
    const id = await repo.upsertEngagement(e);
    await load();
    return id;
  };

  const deleteEngagement = async (id: string) => {
    const ok = await repo.deleteEngagement(id);
    await load();
    return ok;
  };

  const startVoyage = async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const active = derived.active;
    if (!active) return { ok: false, reason: 'Add your current yacht first.' };
    if (data.voyages.some((v) => v.endedAt === null)) return { ok: true };
    const mode = await chooseMode(simulatedGps);
    if (!mode.ok) return mode;
    const startedAt = Date.now();
    const v: Voyage = {
      id: newId(),
      engagementId: active.id,
      startedAt,
      endedAt: null,
      startLat: null,
      startLon: null,
      endLat: null,
      endLon: null,
      startPlace: '',
      endPlace: '',
      distanceNm: 0,
      directNm: 0,
      durationMin: 0,
      underwayMin: 0,
      nightMin: 0,
      avgKn: 0,
      maxKn: 0,
      passageType: 'day',
      asSkipper: isSkipperPosition(active.position),
      source: 'gps',
      status: 'draft',
      flags: [],
      segments: [],
      notes: '',
      updatedAt: startedAt,
    };
    await repo.saveVoyage(v);
    try {
      await startTracking(v.id, mode.mode, startedAt);
    } catch (e) {
      await repo.deleteVoyage(v.id);
      await stopTracking();
      await load();
      return { ok: false, reason: e instanceof Error ? e.message : 'Could not start GPS.' };
    }
    if (mode.mode !== 'simulated') scheduleStillUnderway(startedAt);
    await load();
    return { ok: true };
  };

  const stopVoyage = async (): Promise<string | null> => {
    const v = data.voyages.find((x) => x.endedAt === null);
    if (!v) return null;
    const simEnd = await stopTracking();
    cancelStillUnderway();
    const fixes = await repo.getTrack(v.id);
    const endedAt = simEnd ?? Date.now();
    const s = summarizeTrack(fixes, v.startedAt, endedAt);
    const prev = data.voyages.find((x) => x.endedAt !== null && x.endLat !== null);
    const done: Voyage = {
      ...v,
      endedAt,
      startLat: s.first?.lat ?? null,
      startLon: s.first?.lon ?? null,
      endLat: s.last?.lat ?? null,
      endLon: s.last?.lon ?? null,
      startPlace: s.first ? placeName(s.first.lat, s.first.lon) : derived.lastPlace,
      endPlace: s.last ? placeName(s.last.lat, s.last.lon) : '',
      distanceNm: s.distanceNm,
      directNm: s.directNm,
      durationMin: s.durationMin,
      underwayMin: s.underwayMin,
      nightMin: s.nightMin,
      avgKn: s.avgKn,
      maxKn: s.maxKn,
      passageType: s.passageType,
      segments: s.segments,
      flags: voyageFlags({
        source: 'gps',
        durationMin: s.durationMin,
        avgKn: s.avgKn,
        fixes: s.fixes,
        start: s.first,
        previousEnd: prev && prev.endLat !== null && prev.endLon !== null ? { lat: prev.endLat, lon: prev.endLon } : null,
      }),
    };
    await repo.saveVoyage(done);
    await load();
    return done.id;
  };

  const saveVoyage = async (v: Voyage) => {
    await repo.saveVoyage(v);
    await load();
  };

  const confirmVoyage = async (v: Voyage) => {
    const ctxBefore: Ctx = { vessels: data.vessels, engagements: data.engagements, voyages: data.voyages, entries: data.entries };
    const before = qualsFor(ctxBefore, data.docs, today);
    await repo.saveVoyage({ ...v, status: 'confirmed' });
    const next = await load();
    const after = qualsFor({ vessels: next.vessels, engagements: next.engagements, voyages: next.voyages, entries: next.entries }, next.docs, today);
    for (let i = 0; i < after.length; i++) {
      const hit = newlyMet(before[i], after[i]).filter((r) => r.rule.type !== 'certificate');
      if (hit.length) {
        const what = hit.map((r) => r.rule.label.toLowerCase()).join(', ');
        notifyNow('Milestone reached', `You've reached the ${what} requirement for ${after[i].def.name}.`);
        flash(`Milestone · ${after[i].def.name}: ${hit[0].rule.label}`);
        return;
      }
    }
    flash(`Voyage saved · ${Math.round(v.distanceNm)} NM added to your record`);
  };

  const deleteVoyage = async (id: string) => {
    if (data.voyages.find((v) => v.id === id)?.endedAt === null) {
      await stopTracking();
      cancelStillUnderway();
    }
    await repo.deleteVoyage(id);
    await load();
  };

  const saveEntry = async (e: Parameters<typeof repo.saveEntry>[0]) => {
    const id = await repo.saveEntry(e);
    await load();
    return id;
  };

  const deleteEntry = async (id: string) => {
    await repo.deleteEntry(id);
    await load();
  };

  const afterDocs = async () => {
    const d = await load();
    scheduleDocReminders(d.docs, dayKey(Date.now()));
  };

  const saveDoc = async (d: Parameters<typeof repo.saveDoc>[0]) => {
    const id = await repo.saveDoc(d);
    await afterDocs();
    return id;
  };

  const renewDoc = async (oldId: string, d: Parameters<typeof repo.saveDoc>[0]) => {
    const id = await repo.renewDoc(oldId, d);
    await afterDocs();
    return id;
  };

  const deleteDoc = async (id: string) => {
    await repo.deleteDoc(id);
    await afterDocs();
  };

  const wipe = async () => {
    await stopTracking();
    cancelStillUnderway();
    await repo.wipeAll();
    await afterDocs();
  };

  const setSimulatedGps = (on: boolean) => {
    repo.setKv('simulated_gps', on ? '1' : null);
    setSim(on);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const value: AppStore = {
    ...data,
    ...derived,
    ready,
    // A stale reading from a voyage that has since stopped is never shown.
    live: liveVoyage && live?.voyage.id === liveVoyage.id ? live : null,
    toast,
    simulatedGps,
    reload,
    saveProfile,
    finishOnboarding,
    saveVessel,
    deleteVessel,
    saveEngagement,
    deleteEngagement,
    startVoyage,
    stopVoyage,
    saveVoyage,
    confirmVoyage,
    deleteVoyage,
    saveEntry,
    deleteEntry,
    saveDoc,
    renewDoc,
    deleteDoc,
    wipe,
    setSimulatedGps,
    flash,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}

/** Vessel and engagement for a record. */
export function useRecordContext(engagementId: string | undefined) {
  const { engagements, vessels } = useAppStore();
  const engagement = engagements.find((e) => e.id === engagementId) ?? null;
  const vessel = engagement ? (vessels.find((v) => v.id === engagement.vesselId) ?? null) : null;
  return { engagement, vessel };
}
