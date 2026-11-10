import assert from 'node:assert/strict';
import { test } from 'vitest';
import { joinSummary, pct } from './results-summary.ts';

test('pct gives one decimal, <0.1% for tiny shares and 0% for none', () => {
  assert.equal(pct(1, 8), '12.5%');
  assert.equal(pct(1, 2000), '<0.1%');
  assert.equal(pct(0, 10), '0%');
  assert.equal(pct(3, 0), '0%');
  assert.equal(pct(10, 10), '100.0%');
});

test('joinSummary drops empty segments and adds no period', () => {
  assert.equal(joinSummary(['9 × 12 cells', '', null, 'range 0 – 1', false]), '9 × 12 cells · range 0 – 1');
  assert.equal(joinSummary([]), '');
});
