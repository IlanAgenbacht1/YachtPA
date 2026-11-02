/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { draftFromText, splitDuties, tagActivities } from './draft.ts';

describe('draftFromText', () => {
  it('turns a dictated day into duties and ticks', () => {
    const d = draftFromText(
      'Today we washed down the exterior, polished the stainless, checked the tender, changed the fuel filters on the generator and then did a safety inspection before departure.',
    );
    assert.deepEqual(d.duties, [
      'Washed down the exterior',
      'Polished the stainless',
      'Checked the tender',
      'Changed the fuel filters on the generator',
      'Did a safety inspection before departure',
    ]);
    assert.deepEqual(d.activities, ['Washdown', 'Tender', 'Maintenance', 'Safety drill']);
  });

  it('splits sentences and lines, keeps "and" inside a phrase, drops fillers', () => {
    assert.deepEqual(splitDuties('Um so we sanded and varnished the cap rail. Then I did the bridge watch from 2 to 6\nprovisioning run'), [
      'Sanded and varnished the cap rail',
      'Did the bridge watch from 2 to 6',
      'Provisioning run',
    ]);
  });

  it('keeps a list of things inside one job together', () => {
    assert.deepEqual(splitDuties('Changed the oil, filters and impellers'), ['Changed the oil, filters and impellers']);
  });

  it('does not tick bunkering for fuel filters, and keeps night watch specific', () => {
    assert.deepEqual(tagActivities('Changed the fuel filters'), ['Maintenance']);
    assert.deepEqual(tagActivities('Night watch midnight to four'), ['Night watch']);
    assert.ok(tagActivities('Refuelled in Antibes and did a night watch').includes('Bunkering'));
  });

  it('adds nothing for empty or filler-only input', () => {
    assert.deepEqual(draftFromText('  um. and then. '), { duties: [], activities: [] });
  });
});
