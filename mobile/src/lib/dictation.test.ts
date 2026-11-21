/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyResult, EMPTY_TRANSCRIPT, fullText } from './dictation.ts';

describe('dictation', () => {
  it('commits Android-style phrase-by-phrase finals', () => {
    let t = EMPTY_TRANSCRIPT;
    t = applyResult(t, 'washed down', false);
    t = applyResult(t, 'Washed down the exterior.', true);
    t = applyResult(t, 'checked the', false);
    assert.equal(fullText(t), 'Washed down the exterior. checked the');
    t = applyResult(t, 'Checked the tender.', true);
    assert.equal(fullText(t), 'Washed down the exterior. Checked the tender.');
  });
  it('keeps an iOS-style growing interim if stopped before a final', () => {
    let t = EMPTY_TRANSCRIPT;
    t = applyResult(t, 'Polished', false);
    t = applyResult(t, 'Polished the stainless', false);
    assert.equal(fullText(t), 'Polished the stainless');
  });
});
