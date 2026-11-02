/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluate, QUALIFICATIONS, type QVoyage } from './qualifications.ts';

const NOW = Date.UTC(2026, 10, 2, 12);
const coastal = QUALIFICATIONS.find((q) => q.id === 'rya-ym-coastal')!;
const offshore = QUALIFICATIONS.find((q) => q.id === 'rya-ym-offshore')!;
const small = { loaM: 14, gt: 20, propulsion: 'sail' as const };

let n = 0;
function day(over: Partial<QVoyage> = {}): QVoyage {
  n++;
  const date = `2026-0${1 + (n % 9)}-${String(1 + (n % 27)).padStart(2, '0')}`;
  return { startedAt: NOW - n * 86400000, distanceNm: 30, straightNm: 25, nightMin: 0, overnight: false, skipper: false, underwayByDay: { [date + '-' + n]: 300 }, vessel: small, ...over };
}

describe('evaluate', () => {
  it('counts a day only with at least 4 h underway', () => {
    const r = evaluate(coastal, 'sail', [day(), day({ underwayByDay: { '2026-05-05': 200 } })], [], NOW);
    assert.equal(r.rules.find((x) => x.rule.id === 'days')!.value, 1);
  });

  it('ignores voyages of the other discipline, outside the window, and on big yachts for <24 m rules', () => {
    const r = evaluate(coastal, 'sail', [
      day({ vessel: { ...small, propulsion: 'motor' } }),
      day({ startedAt: NOW - 11 * 365 * 86400000 }),
      day({ vessel: { ...small, loaM: 40 } }),
      day(),
    ], [], NOW);
    assert.equal(r.rules.find((x) => x.rule.id === 'days')!.value, 1);
    // miles have no size limit for Coastal: the 40 m yacht counts there
    assert.equal(r.rules.find((x) => x.rule.id === 'miles')!.value, 60);
  });

  it('Coastal sea time is met with 30 days, 2 as skipper, 800 miles, 12 night hours', () => {
    const vs = Array.from({ length: 30 }, (_, i) => day({ distanceNm: 27, nightMin: 25, skipper: i < 2 }));
    const r = evaluate(coastal, 'sail', vs, [], NOW);
    assert.equal(r.seaTimeMet, true);
    assert.equal(r.progress, 1);
    assert.equal(r.rules.find((x) => x.rule.id === 'radio')!.met, false);
  });

  it('Offshore passages need length by track and straight line, plus overnight and skipper', () => {
    const long = (o: Partial<QVoyage>) => day({ distanceNm: 80, straightNm: 70, ...o });
    const vs = [long({ overnight: true, skipper: true }), long({ overnight: true }), long({ skipper: true }), long({}), long({}), day({ distanceNm: 90, straightNm: 40 })];
    const r = evaluate(offshore, 'sail', vs, [], NOW);
    const p = r.rules.find((x) => x.rule.id === 'passages')!;
    assert.equal(p.met, true);
    assert.equal(p.detail, '2 / 2 overnight · 2 / 2 as skipper');
    const r2 = evaluate(offshore, 'sail', vs.slice(2), [], NOW);
    assert.equal(r2.rules.find((x) => x.rule.id === 'passages')!.met, false);
  });

  it('documents count only while in date', () => {
    const docs = [{ name: 'VHF SRC', expires: null }, { name: 'First Aid at Sea', expires: '2026-01-01' }];
    const r = evaluate(coastal, 'sail', [], docs, NOW);
    assert.equal(r.rules.find((x) => x.rule.id === 'radio')!.met, true);
    assert.equal(r.rules.find((x) => x.rule.id === 'firstaid')!.met, false);
  });

  it('flags unknown vessel size', () => {
    const r = evaluate(offshore, 'sail', [day({ vessel: { loaM: null, gt: null, propulsion: 'sail' } })], [], NOW);
    assert.equal(r.unknownSize, true);
  });
});
