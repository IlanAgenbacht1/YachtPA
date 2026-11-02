/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderRecordHtml, type RecordData } from './recordHtml.ts';

const base: RecordData = {
  name: 'Sam <Rivers>',
  nationality: 'South Africa',
  generatedAt: '2 Nov 2026',
  totals: { nm: 412.34, underwayHours: 51.2, nightHours: 9.5, seaDays: 7, voyages: 9, overnight: 1 },
  vessels: [
    { name: 'M/Y Shadow', propulsion: 'motor', loaM: 42, gt: 380, flag: 'Cayman Islands', position: 'Deckhand', startDate: '2026-03-01', endDate: null, captain: 'J. Smith', company: null, daysAboard: 247, seaDays: 7, nm: 412.34 },
  ],
  voyages: [{ date: '2026-10-30', vessel: 'M/Y Shadow', from: 'Port Louis', to: 'Black River', nm: 21.04, underwayMin: 135, nightMin: 0, kind: 'Day', source: 'gps' }],
  logs: [{ date: '2026-10-30', vessel: 'M/Y Shadow', activities: ['Washdown'], duties: ['Polished <stainless>'] }],
};

describe('renderRecordHtml', () => {
  const html = renderRecordHtml(base);
  it('escapes user text', () => {
    assert.ok(html.includes('Sam &lt;Rivers&gt;'));
    assert.ok(html.includes('Polished &lt;stainless&gt;'));
    assert.ok(!html.includes('<Rivers>'));
  });
  it('shows totals, vessels, voyages and a signature block', () => {
    for (const s of ['412.3', 'M/Y Shadow', 'Port Louis → Black River', '2h 15m', "Master's name", '1 Mar 2026 – present']) {
      assert.ok(html.includes(s), s);
    }
  });
  it('never claims verification', () => {
    assert.ok(html.includes('not verified by YachtPA'));
    assert.ok(!/certif(y|ied)/i.test(html));
  });
});
