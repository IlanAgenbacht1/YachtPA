/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { acceptFix, filterTrack, trackDistanceNm, underwaySegments, type Fix } from '../track';

const T0 = Date.UTC(2026, 8, 25, 6, 0);
const MIN = 60_000;
/** 1 NM of latitude. */
const NM_LAT = 1 / 60;

function fix(minute: number, lat: number, lon: number, accuracy = 8): Fix {
  return { ts: T0 + minute * MIN, lat, lon, accuracy, speedKn: null, heading: null };
}

/** Build a track: stationary for `still` minutes, then moving at `kn` for `moving` minutes, then stationary `after` minutes. */
function synthetic(still: number, moving: number, kn: number, after: number): Fix[] {
  const out: Fix[] = [];
  let lat = -20.16;
  const lon = 57.5;
  let m = 0;
  for (let i = 0; i < still; i++, m++) out.push(fix(m, lat + (i % 2) * 0.00005, lon));
  for (let i = 0; i < moving; i++, m++) {
    lat -= (kn / 60) * NM_LAT;
    out.push(fix(m, lat, lon));
  }
  for (let i = 0; i < after; i++, m++) out.push(fix(m, lat + (i % 2) * 0.00005, lon));
  return out;
}

test('acceptFix drops poor accuracy and impossible jumps', () => {
  const a = fix(0, -20.16, 57.5);
  assert.equal(acceptFix(null, a), true);
  assert.equal(acceptFix(a, fix(1, -20.16, 57.5, 120)), false);
  assert.equal(acceptFix(a, fix(1, -21.16, 57.5)), false); // 60 NM in a minute
  assert.equal(acceptFix(a, fix(1, -20.1605, 57.5)), true);
  assert.equal(acceptFix(a, fix(0, -20.1605, 57.5)), false); // not after previous
});

test('filterTrack keeps a clean track intact', () => {
  const t = synthetic(0, 10, 8, 0);
  assert.equal(filterTrack(t).length, 10);
});

test('trackDistanceNm: 30 minutes at 8 kn is 4 NM', () => {
  const t = synthetic(0, 31, 8, 0);
  const nm = trackDistanceNm(t);
  assert.ok(Math.abs(nm - 4) < 0.05, `got ${nm}`);
});

test('anchored jitter produces no underway segment', () => {
  const t = synthetic(40, 0, 0, 0);
  assert.equal(underwaySegments(t).length, 0);
});

test('one passage between two stationary periods is one segment', () => {
  const t = synthetic(5, 30, 8, 15);
  const segs = underwaySegments(t);
  assert.equal(segs.length, 1);
  const mins = (segs[0].endTs - segs[0].startTs) / MIN;
  assert.ok(mins >= 29 && mins <= 31, `segment lasted ${mins} min`);
  assert.ok(Math.abs(segs[0].nm - 4) < 0.15, `segment nm ${segs[0].nm}`);
});

test('a short pause under endMin does not split a segment', () => {
  const a = synthetic(0, 20, 8, 5); // 20 min moving, 5 min stop
  const lastLat = a[a.length - 1].lat;
  const b: Fix[] = [];
  for (let i = 1; i <= 20; i++) b.push(fix(25 + i - 1, lastLat - i * (8 / 60) * NM_LAT, 57.5));
  const segs = underwaySegments([...a, ...b]);
  assert.equal(segs.length, 1);
});

test('a stop longer than endMin splits into two segments', () => {
  const a = synthetic(0, 20, 8, 15);
  const lastLat = a[a.length - 1].lat;
  const b: Fix[] = [];
  for (let i = 1; i <= 20; i++) b.push(fix(35 + i - 1, lastLat - i * (8 / 60) * NM_LAT, 57.5));
  const segs = underwaySegments([...a, ...b]);
  assert.equal(segs.length, 2);
});
