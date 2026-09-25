/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isNight, nightMinutes, spansFullNight, sunDay } from '../sun';

const mauritius = { lat: -20.16, lon: 57.5 };
const H = 3_600_000;

function utc(y: number, m: number, d: number, hh: number, mm = 0): number {
  return Date.UTC(y, m - 1, d, hh, mm);
}

test('sunrise and sunset in Mauritius on 25 Sep are about 02:00 and 14:10 UTC', () => {
  const day = sunDay(utc(2026, 9, 25, 8), mauritius);
  if (day.sunrise === null || day.sunset === null) throw new Error('expected a sunrise and a sunset');
  const rise = (day.sunrise - utc(2026, 9, 25, 0)) / H;
  const set = (day.sunset - utc(2026, 9, 25, 0)) / H;
  assert.ok(Math.abs(rise - 1.95) < 0.25, `sunrise at ${rise}h UTC`);
  assert.ok(Math.abs(set - 14.15) < 0.25, `sunset at ${set}h UTC`);
});

test('midday is day, midnight is night', () => {
  assert.equal(isNight(utc(2026, 9, 25, 8), mauritius), false);
  assert.equal(isNight(utc(2026, 9, 25, 20), mauritius), true);
  assert.equal(isNight(utc(2026, 9, 25, 0, 30), mauritius), true);
});

test('polar night is all night', () => {
  const svalbard = { lat: 78.2, lon: 15.6 };
  assert.equal(isNight(utc(2026, 12, 21, 12), svalbard), true);
  assert.equal(isNight(utc(2026, 6, 21, 0), svalbard), false);
});

test('night minutes across a sunset', () => {
  // 13:00 to 16:00 UTC, sunset ~14:10: about 110 minutes of night.
  const pts = [
    { ...mauritius, ts: utc(2026, 9, 25, 13) },
    { ...mauritius, ts: utc(2026, 9, 25, 16) },
  ];
  const n = nightMinutes(pts);
  assert.ok(Math.abs(n - 110) < 20, `got ${n}`);
});

test('spansFullNight', () => {
  assert.equal(spansFullNight(utc(2026, 9, 25, 10), utc(2026, 9, 25, 16), mauritius), false);
  assert.equal(spansFullNight(utc(2026, 9, 25, 10), utc(2026, 9, 26, 4), mauritius), true);
});
