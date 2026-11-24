/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { milestonesReached } from './milestones.ts';

describe('milestones', () => {
  it('names the highest round number crossed', () => {
    assert.deepEqual(milestonesReached({ nm: 90, met: [] }, { nm: 600, met: [] }), ['500 NM logged']);
  });
  it('nothing when no line is crossed', () => {
    assert.deepEqual(milestonesReached({ nm: 101, met: [] }, { nm: 240, met: [] }), []);
  });
  it('a newly met qualification comes first', () => {
    assert.deepEqual(milestonesReached({ nm: 990, met: [] }, { nm: 1010, met: ['ymc'] }, { ymc: 'Yachtmaster Coastal' }), [
      'You appear to meet the sea time for Yachtmaster Coastal',
      '1,000 NM logged',
    ]);
  });
  it('a qualification already met is not repeated', () => {
    assert.deepEqual(milestonesReached({ nm: 10, met: ['ymc'] }, { nm: 20, met: ['ymc'] }), []);
  });
});
