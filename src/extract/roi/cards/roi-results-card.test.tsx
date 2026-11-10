// The ROI Results card's one-line summary (docs/ui.md, section 7): size, range of the measurement shown,
// units and the flagged share, joined by " · " with no final period.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { RoiResult, RoiRow, RoiStats } from '../../../types/index.ts';
import { createPanel, createRoi } from '../../project/project.ts';
import { roiSummary } from './roi-results-card.tsx';

const stats = (sum: number, flaggedPx = 0): RoiStats => ({
  areaPx: 100,
  signalPx: 50,
  flaggedPx,
  sum,
  mean: sum / 100,
  meanSignal: sum / 50,
  max: sum / 10,
});

function scene(flaggedPx = 0) {
  const panel = createPanel('IVIS', 1, 'roi');
  panel.grid.rows = 1;
  panel.grid.cols = 2;
  const geom = { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2 } as never;
  const a = createRoi('ellipse', geom, { name: 'Liver' });
  const b = createRoi('rect', geom, { name: 'Spleen' });
  panel.rois.push(a, b);
  const row = (roi: typeof a, col: number, s: RoiStats): RoiRow => ({ roi, row: 0, col, outline: [], stats: s });
  const res: RoiResult = {
    rows: [row(a, 0, stats(10, flaggedPx)), row(a, 1, stats(30)), row(b, 0, stats(20)), row(b, 1, stats(40))],
    pxArea: null,
    unit: null,
  };
  return { panel, res };
}

test('the summary gives regions × boxes and the range of the measurement shown; nothing flagged is left out', () => {
  const { panel, res } = scene();
  assert.equal(roiSummary(panel, res, 'sum'), '2 regions × 2 boxes · range 10 – 40 · pixel units');
  assert.equal(roiSummary(panel, res, 'max'), '2 regions × 2 boxes · range 1 – 4 · pixel units');
});

test('the flagged share of signal pixels uses pct, and areas name their unit', () => {
  const { panel, res } = scene(5);
  res.unit = 'mm';
  assert.equal(
    roiSummary(panel, res, 'sum'),
    `2 regions × 2 boxes · range 10 – 40 · areas in mm² · 2.5% of signal pixels flagged (ΔE > ${panel.settings.maxDeltaE})`,
  );
});
