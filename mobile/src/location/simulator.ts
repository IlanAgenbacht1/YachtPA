/**
 * A stand-in for the GPS: writes plausible fixes into the same table the
 * background task does, one simulated minute per real second, so every screen
 * downstream is exercised for real. Runs Port Louis → Black River at about
 * 10 kn and then sits at anchor with a little jitter.
 */
import { appendFixes } from '@/db';
import { haversineNm, initialBearingDeg, type Fix, type LatLon } from '@/domain';

const START: LatLon = { lat: -20.155, lon: 57.49 };
const DEST: LatLon = { lat: -20.36, lon: 57.36 };

export type Simulation = { stop: () => void };

const sims = new Map<string, Simulation>();

export function isSimulating(voyageId: string): boolean {
  return sims.has(voyageId);
}

export function stopSimulation(voyageId: string): void {
  sims.get(voyageId)?.stop();
}

export function startSimulation(voyageId: string, startedAt: number, opts: { tickMs?: number; simMinutesPerTick?: number } = {}): Simulation {
  stopSimulation(voyageId);
  const tickMs = opts.tickMs ?? 1000;
  const stepMin = opts.simMinutesPerTick ?? 1;
  let t = startedAt;
  let pos: LatLon = { ...START };
  let k = 0;
  let arrived = false;
  let busy = false;

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      k += 1;
      t += stepMin * 60_000;
      let speedKn = 0;
      let heading = initialBearingDeg(pos, DEST);
      if (!arrived) {
        speedKn = 9.6 + 2.2 * Math.sin(k / 2.4);
        const legNm = (speedKn * stepMin) / 60;
        const remaining = haversineNm(pos, DEST);
        if (legNm >= remaining) {
          pos = { ...DEST };
          arrived = true;
        } else {
          pos = advance(pos, heading, legNm);
        }
      } else {
        // At anchor: a few metres of GPS wander, no reported speed.
        heading = (heading + 180) % 360;
        pos = { lat: DEST.lat + (Math.random() - 0.5) * 0.0001, lon: DEST.lon + (Math.random() - 0.5) * 0.0001 };
      }
      const fix: Fix = {
        ts: t,
        lat: pos.lat,
        lon: pos.lon,
        accuracy: 6 + Math.random() * 6,
        speedKn: arrived ? 0 : speedKn,
        heading,
      };
      await appendFixes(voyageId, [fix]);
    } finally {
      busy = false;
    }
  };

  const id = setInterval(() => void tick(), tickMs);
  const sim: Simulation = {
    stop: () => {
      clearInterval(id);
      sims.delete(voyageId);
    },
  };
  sims.set(voyageId, sim);
  return sim;
}

/** Move `nm` along a bearing on a sphere. */
function advance(from: LatLon, bearingDeg: number, nm: number): LatLon {
  const R = 3440.065;
  const δ = nm / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (from.lat * Math.PI) / 180;
  const λ1 = (from.lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
}
