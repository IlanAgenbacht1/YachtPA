/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatPosition, nearestPlace, placeLabel } from '../places';
import type { Fix } from '../track';
import { summarize } from '../voyage';

const MIN = 60_000;
const NM_LAT = 1 / 60;

function passage(startUtc: number, minutes: number, kn: number): Fix[] {
  const out: Fix[] = [];
  let lat = -20.16;
  for (let m = 0; m <= minutes; m++) {
    out.push({ ts: startUtc + m * MIN, lat, lon: 57.5, accuracy: 6, speedKn: null, heading: null });
    lat -= (kn / 60) * NM_LAT;
  }
  return out;
}

test('summarize a daytime passage', () => {
  const s = summarize(passage(Date.UTC(2026, 8, 25, 6), 60, 9));
  assert.ok(Math.abs(s.nm - 9) < 0.1, `nm ${s.nm}`);
  assert.equal(s.durationMin, 60);
  assert.ok(s.underwayMin >= 59, `underway ${s.underwayMin}`);
  assert.equal(s.nightMin, 0);
  assert.ok(Math.abs(s.avgKn - 9) < 0.3, `avg ${s.avgKn}`);
  assert.ok(Math.abs(s.maxKn - 9) < 0.3, `max ${s.maxKn}`);
  assert.equal(s.passage, 'day');
  assert.equal(s.segments.length, 1);
  assert.ok(s.headingDeg !== null && Math.abs(s.headingDeg - 180) < 1);
});

test('summarize an evening passage that crosses sunset is a night passage', () => {
  // 13:00 to 15:00 UTC with sunset about 14:09: roughly 50 minutes of night.
  const s = summarize(passage(Date.UTC(2026, 8, 25, 13), 120, 6));
  assert.ok(s.nightMin > 40 && s.nightMin < 70, `night ${s.nightMin}`);
  assert.equal(s.passage, 'night');
});

test('summarize a passage through a whole night is overnight', () => {
  const s = summarize(passage(Date.UTC(2026, 8, 25, 12), 18 * 60, 6));
  assert.equal(s.passage, 'overnight');
  assert.ok(s.nightMin > 600, `night ${s.nightMin}`);
});

test('summarize with too few fixes is empty', () => {
  const s = summarize([]);
  assert.equal(s.nm, 0);
  assert.equal(s.passage, 'day');
});

test('places: nearest within 3 NM, else a formatted position', () => {
  assert.equal(nearestPlace({ lat: -20.16, lon: 57.5 })?.name, 'Port Louis');
  assert.equal(nearestPlace({ lat: -20.25, lon: 57.45 }), null);
  assert.equal(placeLabel({ lat: -20.36, lon: 57.36 }), 'Black River');
  assert.equal(formatPosition({ lat: -20.158, lon: 57.498 }), "20°09.5′S 057°29.9′E");
});
