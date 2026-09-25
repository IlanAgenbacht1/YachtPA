/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { haversineNm, initialBearingDeg, knots, rhumbLineNm } from '../geo';

const portLouis = { lat: -20.158, lon: 57.498 };
const blackRiver = { lat: -20.36, lon: 57.36 };

test('haversine: Port Louis to Black River is about 14 NM', () => {
  const nm = haversineNm(portLouis, blackRiver);
  assert.ok(nm > 13 && nm < 16, `got ${nm}`);
});

test('haversine: zero for the same point', () => {
  assert.equal(haversineNm(portLouis, portLouis), 0);
});

test('haversine: one degree of latitude is 60 NM', () => {
  const nm = haversineNm({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(Math.abs(nm - 60) < 0.2, `got ${nm}`);
});

test('rhumb line is at least as long as the great circle', () => {
  const gc = haversineNm(portLouis, blackRiver);
  const rl = rhumbLineNm(portLouis, blackRiver);
  assert.ok(rl >= gc - 1e-9 && rl < gc * 1.01);
});

test('initial bearing: Port Louis to Black River is roughly south-south-west', () => {
  const b = initialBearingDeg(portLouis, blackRiver);
  assert.ok(b > 195 && b < 220, `got ${b}`);
});

test('knots: 10 NM in an hour is 10 kn', () => {
  assert.equal(knots(10, 3_600_000), 10);
  assert.equal(knots(10, 0), 0);
});
