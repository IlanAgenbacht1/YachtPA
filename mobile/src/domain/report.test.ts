/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildReport, trackingGaps, type LogLine } from './report.ts';

const T = Date.UTC(2026, 10, 23, 8, 0);
const line = (i: number, level: LogLine['level'] = 'info'): LogLine => ({ ts: T + i * 60000, level, area: 'voyage', message: `event ${i}`, detail: null });

describe('buildReport', () => {
  it('puts phone, settings and newest lines first', () => {
    const r = buildReport({ app: '0.1.0', phone: 'samsung SM-S911B, Android 14', settings: { mic: true, simulate: false } }, [line(1), line(2, 'error')]);
    assert.match(r, /Phone: samsung SM-S911B, Android 14/);
    assert.match(r, /Settings: mic=true, simulate=false/);
    assert.ok(r.indexOf('event 2') < r.indexOf('event 1'));
    assert.match(r, /ERROR \[voyage\] event 2/);
  });
  it('stays under the size limit', () => {
    const many = Array.from({ length: 5000 }, (_, i) => line(i));
    const r = buildReport({ app: 'x', phone: 'y', settings: {} }, many, 5000);
    assert.ok(r.length <= 5100);
    assert.match(r, /older lines left out/);
  });
});

describe('trackingGaps', () => {
  it('finds stretches with no position', () => {
    const fixes = [0, 1, 2, 50, 51].map((m) => ({ ts: T + m * 60000, lat: 0, lon: 0 }));
    assert.deepEqual(trackingGaps(fixes).map((g) => g.minutes), [48]);
  });
});
