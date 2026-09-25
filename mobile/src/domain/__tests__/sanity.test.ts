/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanityFlags } from '../sanity';

test('a normal voyage raises no flags', () => {
  assert.deepEqual(sanityFlags({ durationMin: 90, avgKn: 9, maxKn: 12, nm: 14, fixes: 180 }), []);
});

test('odd voyages are flagged', () => {
  assert.equal(sanityFlags({ durationMin: 90, avgKn: 9, maxKn: 12, nm: 14, fixes: 1 }).length, 1);
  assert.equal(sanityFlags({ durationMin: 30 * 60, avgKn: 9, maxKn: 12, nm: 14, fixes: 100 }).length, 1);
  assert.equal(sanityFlags({ durationMin: 60, avgKn: 55, maxKn: 70, nm: 55, fixes: 100 }).length, 1);
  assert.equal(sanityFlags({ durationMin: 60, avgKn: 0, maxKn: 0.4, nm: 0.02, fixes: 100 }).length, 1);
});
