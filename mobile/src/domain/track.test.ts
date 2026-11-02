/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { destination, distanceNm, type LatLon } from './geo.ts';
import { nextCrossing, isNight } from './sun.ts';
import { filterFixes, sanityCheck, summarise, type Fix } from './track.ts';

const PORT_LOUIS: LatLon = { lat: -20.16, lon: 57.5 };
// 2026-11-02 06:00 UTC = 10:00 in Mauritius: broad daylight.
const MORNING = Date.UTC(2026, 10, 2, 6, 0, 0);
const MIN = 60000;

/** A straight run at `kn` knots, one fix every `everySec` seconds, for `minutes`. */
function run(from: LatLon, bearing: number, kn: number, minutes: number, start: number, everySec = 60): Fix[] {
  const out: Fix[] = [];
  for (let s = 0; s <= minutes * 60; s += everySec) {
    out.push({ ...destination(from, bearing, (kn * s) / 3600), ts: start + s * 1000, accuracy: 8 });
  }
  return out;
}

/** Fixes scattered within `radiusM` of a point, as GPS does at anchor. Deterministic. */
function jitter(at: LatLon, minutes: number, start: number, radiusM = 15, everySec = 15): Fix[] {
  const out: Fix[] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let s = 0; s <= minutes * 60; s += everySec) {
    const p = destination(at, rnd() * 360, (rnd() * radiusM) / 1852);
    out.push({ ...p, ts: start + s * 1000, accuracy: 10 });
  }
  return out;
}

describe('geo', () => {
  it('one minute of latitude is one nautical mile', () => {
    assert.ok(Math.abs(distanceNm({ lat: 0, lon: 0 }, { lat: 1 / 60, lon: 0 }) - 1) < 0.01);
  });
});

describe('filterFixes', () => {
  it('drops inaccurate fixes and impossible jumps', () => {
    const base = run(PORT_LOUIS, 180, 8, 5, MORNING);
    const bad: Fix[] = [
      { ...base[2], ts: base[2].ts + 1000, accuracy: 120 },
      { ...destination(PORT_LOUIS, 0, 30), ts: base[3].ts + 1000, accuracy: 5 },
    ];
    const kept = filterFixes([...base, ...bad]);
    assert.equal(kept.length, base.length);
  });
});

describe('summarise', () => {
  it('a steady hour at 10 kn is 10 NM and 60 minutes underway', () => {
    const s = summarise(run(PORT_LOUIS, 168, 10, 60, MORNING));
    assert.ok(Math.abs(s.distanceNm - 10) < 0.3, `distance ${s.distanceNm}`);
    assert.ok(Math.abs(s.underwayMin - 60) <= 2, `underway ${s.underwayMin}`);
    assert.ok(Math.abs(s.avgKn - 10) < 0.3, `avg ${s.avgKn}`);
    assert.ok(Math.abs(s.maxKn - 10) < 0.3, `max ${s.maxKn}`);
    assert.equal(s.nightMin, 0);
    assert.equal(s.headingDeg, 168);
  });

  it('two hours of GPS jitter at anchor log no miles', () => {
    const s = summarise(jitter(PORT_LOUIS, 120, MORNING));
    assert.equal(s.distanceNm, 0);
    assert.equal(s.underwayMin, 0);
    assert.equal(s.durationMin, 120);
  });

  it('anchor, passage, anchor counts only the passage', () => {
    const a = jitter(PORT_LOUIS, 30, MORNING);
    const leg = run(PORT_LOUIS, 200, 9, 90, MORNING + 31 * MIN);
    const end = leg[leg.length - 1];
    const b = jitter(end, 30, end.ts + MIN);
    const s = summarise([...a, ...leg, ...b]);
    assert.ok(Math.abs(s.distanceNm - 13.5) < 0.5, `distance ${s.distanceNm}`);
    assert.equal(s.segments.length, 1);
    assert.ok(Math.abs(s.underwayMin - 90) < 5, `underway ${s.underwayMin}`);
  });

  it('a short drift under two minutes does not start a segment', () => {
    const drift = run(PORT_LOUIS, 90, 2, 1, MORNING, 15);
    const s = summarise(drift);
    assert.equal(s.distanceNm, 0);
  });

  it('counts night hours from the sun, not the clock', () => {
    // 2026-11-02 18:00 UTC = 22:00 Mauritius.
    const s = summarise(run(PORT_LOUIS, 168, 8, 60, Date.UTC(2026, 10, 2, 18, 0, 0)));
    assert.ok(Math.abs(s.nightMin - s.underwayMin) < 0.01);
    assert.ok(s.nightMin > 55);
  });
});

describe('passage type', () => {
  it('a passage from afternoon to next morning is overnight', () => {
    // 2026-11-02 12:00 UTC = 16:00 Mauritius, 18 h at 7 kn ends 10:00 local.
    const s = summarise(run(PORT_LOUIS, 90, 7, 18 * 60, Date.UTC(2026, 10, 2, 12, 0, 0)));
    assert.equal(s.overnight, true);
    assert.ok(s.nightMin > 9 * 60, `night ${s.nightMin}`);
  });
  it('an evening passage into the dark is a night passage, not overnight', () => {
    const s = summarise(run(PORT_LOUIS, 90, 7, 5 * 60, Date.UTC(2026, 10, 2, 12, 0, 0)));
    assert.equal(s.overnight, false);
    assert.ok(s.nightMin > 0);
  });
});

describe('sun', () => {
  it('London sunset on the 2024 equinox is about 18:14 UTC', () => {
    const t = nextCrossing(Date.UTC(2024, 2, 20, 12), 51.48, 0, 'sunset')!;
    const d = new Date(t);
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    assert.ok(Math.abs(mins - (18 * 60 + 14)) <= 4, d.toISOString());
  });

  it('Port Louis is dark at local midnight and light at noon', () => {
    assert.equal(isNight(Date.UTC(2026, 10, 2, 20), PORT_LOUIS.lat, PORT_LOUIS.lon), true);
    assert.equal(isNight(Date.UTC(2026, 10, 2, 8), PORT_LOUIS.lat, PORT_LOUIS.lon), false);
  });
});

describe('sanityCheck', () => {
  it('flags a start far from the last known position', () => {
    const s = summarise(run(PORT_LOUIS, 168, 10, 30, MORNING));
    const flags = sanityCheck(s, { lat: 43.7, lon: 7.4 });
    assert.ok(flags.some((f) => f.level === 'warn'));
  });
  it('passes a normal voyage', () => {
    const s = summarise(run(PORT_LOUIS, 168, 10, 30, MORNING));
    assert.deepEqual(sanityCheck(s, PORT_LOUIS).map((f) => f.level), ['ok']);
  });
});
