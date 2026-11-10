// The Results tables shared by each card's Download CSV and Copy table: one builder, written as CSV or as
// tab-separated text.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { HeatmapResult, MapField, RoiResult, RoiRow, RoiStats } from '../../types/index.ts';
import { createPanel, createRoi } from './project.ts';
import {
  csvText,
  mapMatrixCsv,
  mapMatrixTsv,
  roiCsv,
  roiWideCsv,
  roiWideTsv,
  toWideCsv,
  toWideTsv,
  tsvText,
} from './project-files.ts';

test('csvText quotes what needs it; tsvText keeps cells as they are and flattens tabs and line breaks', () => {
  const table = [
    ['a,b', 'say "hi"', 1],
    ['x\ty', 'two\nlines', null],
  ];
  assert.equal(csvText(table), '"a,b","say ""hi""",1\nx\ty,"two\nlines",\n');
  assert.equal(tsvText(table), 'a,b\tsay "hi"\t1\nx y\ttwo lines\t');
});

test('the heatmap CSV and TSV have the same layout', () => {
  const panel = createPanel('e');
  panel.grid.rows = 2;
  panel.grid.cols = 2;
  panel.grid.colLabels = ['A, left', 'B'];
  const cell = (value: number) => ({ value, rgb: [1, 2, 3], deltaE: 0.5, flagged: false });
  const result = {
    rows: 2,
    cols: 2,
    cells: [
      [cell(1), cell(2)],
      [cell(3), cell(NaN)],
    ],
  } as unknown as HeatmapResult;
  assert.equal(toWideCsv(panel, result), 'row\\col,"A, left",B\nR1,1,2\nR2,3,\n');
  assert.equal(toWideTsv(panel, result), 'row\\col\tA, left\tB\nR1\t1\t2\nR2\t3\t');
});

const stats = (sum: number, extra: Partial<RoiStats> = {}): RoiStats => ({
  areaPx: 100,
  signalPx: 50,
  flaggedPx: 0,
  sum,
  mean: sum / 100,
  meanSignal: sum / 50,
  max: sum / 10,
  ...extra,
});

function roiScene() {
  const panel = createPanel('IVIS', 1, 'roi');
  panel.grid.rows = 1;
  panel.grid.cols = 2;
  panel.grid.colLabels = ['Mouse 1', 'Mouse 2'];
  const geom = { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2 } as never;
  const liver = createRoi('ellipse', geom, { name: 'Liver' });
  const spleen = createRoi('rect', geom, { name: 'Spleen' });
  const bg = createRoi('rect', geom, { name: 'Background', replicate: false });
  panel.rois.push(liver, spleen, bg);
  const row = (roi: typeof liver, r: number | null, c: number | null, s: RoiStats): RoiRow => ({
    roi,
    row: r,
    col: c,
    outline: [],
    stats: s,
  });
  // Out of order on purpose: the table sorts boxes in reading order, the image row last.
  const result: RoiResult = {
    rows: [
      row(bg, null, null, stats(5)),
      row(liver, 0, 1, stats(2000)),
      row(liver, 0, 0, stats(1000)),
      row(spleen, 0, 0, stats(1 / 3)),
    ],
    pxArea: null,
    unit: null,
  };
  return { panel, result };
}

test('the ROI CSV is the table as shown: one row per box, one column per region, the chosen measurement', () => {
  const { panel, result } = roiScene();
  assert.equal(
    roiWideCsv(panel, result, 'sum'),
    'Total signal,Liver,Spleen,Background\nR1 Mouse 1,1000,0.333333,\nR1 Mouse 2,2000,,\nImage,,,5\n',
  );
  assert.equal(roiWideCsv(panel, result, 'max').split('\n')[1], 'R1 Mouse 1,100,0.0333333,');
  // A scaled measurement without a scale bar has no values.
  assert.equal(roiWideCsv(panel, result, 'area').split('\n')[1], 'R1 Mouse 1,,,');
  assert.equal(
    roiWideTsv(panel, result, 'sum'),
    'Total signal\tLiver\tSpleen\tBackground\nR1 Mouse 1\t1000\t0.333333\t\nR1 Mouse 2\t2000\t\t\nImage\t\t\t5',
  );
  // The long CSV keeps one line per region copy with every measurement.
  assert.equal(roiCsv([{ panel, result }]).trim().split('\n').length, 5);
});

test('the map matrix CSV and TSV have the same layout', () => {
  const field = {
    rows: 2,
    cols: 2,
    xs: [0.5, 1.5],
    ys: [10, 20],
    values: new Float32Array([1, 2, 3, Number.NaN]),
    xName: 'x_µm',
    yName: 'y_µm',
  } as unknown as MapField;
  const panel = createPanel('map', 1, 'map');
  assert.equal(mapMatrixCsv(panel, field), 'y_µm\\x_µm,0.5,1.5\n10,1,2\n20,3,\n');
  assert.equal(mapMatrixTsv(panel, field), 'y_µm\\x_µm\t0.5\t1.5\n10\t1\t2\n20\t3\t');
});
