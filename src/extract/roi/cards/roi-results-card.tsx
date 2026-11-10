// The ROI Results card: summary, the Measurement select, the box × region table, CSV downloads and Copy
// table, and the Show signal toggle. The table stays imperative inside a ref host (cells carry data-r / data-c
// for the hover link to the image and the table can be large); it is rebuilt only when the cached result, the
// metric or the unit changes. Read in render, write in handlers (docs/react.md, "The card pattern").
import { useLayoutEffect, useRef } from 'react';
import type { Panel, RoiResult, RoiStats, WorkspaceContext } from '../../../types/index.ts';
import {
  BoundSelect,
  Btn,
  CardHead,
  Check,
  Field,
  Fields,
  Hint,
  MainStep,
  Notice,
  SplitActions,
} from '../../../ui/index.ts';
import { formatNumber, ROI_METRIC_NAMES, roiCsv, roiWideCsv, roiWideTsv } from '../../project/project-files.ts';
import { useTableHover } from '../../react/use-table-hover.ts';
import { useWorkspace } from '../../react/use-workspace.ts';
import { copyTable, downloadCsv } from '../../results-actions.ts';
import { joinSummary, pct } from '../../results-summary.ts';
import { notify } from '../../workspace/store.ts';
import { metricFor, metricValue, roiTableModel, shortNumber } from '../quantify.ts';
import { useRoiContext } from './roi-context.ts';

type Result = RoiResult | { error: string };

// Not `'rows' in res`: a map field has numeric rows.
const hasRows = (res: Result): res is RoiResult => Array.isArray((res as RoiResult).rows);

/** The select's options; the scaled ones need a scale bar and name its unit. */
export function metricOptions(unit: string | null) {
  const u = unit ?? 'unit';
  return [
    { value: 'sum', label: 'Total signal (sum)' },
    { value: 'mean', label: 'Mean over region' },
    { value: 'max', label: 'Max' },
    { value: 'meanSignal', label: 'Mean over signal pixels' },
    { value: 'signalPx', label: 'Signal area (px)' },
    { value: 'areaPx', label: 'Region area (px)' },
    { value: 'sumArea', label: 'Total signal × area', scaled: true },
    { value: 'signalArea', label: `Signal area (${u}²)`, scaled: true },
    { value: 'area', label: `Region area (${u}²)`, scaled: true },
  ];
}

/** The one-line summary: size, the range of the measurement shown, units and the flagged share of signal. */
export function roiSummary(panel: Panel, res: RoiResult, metric: keyof RoiStats): string {
  const n = panel.rois.length;
  const regions = `${n} region${n === 1 ? '' : 's'}`;
  const boxes = roiTableModel(panel, res).rows.filter((r) => r.row !== null).length;
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  let flagged = 0;
  let signal = 0;
  for (const r of res.rows) {
    const v = metricValue(r.stats, metric);
    if (v !== null && Number.isFinite(v)) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    flagged += r.stats.flaggedPx;
    signal += r.stats.signalPx;
  }
  return joinSummary([
    boxes ? `${regions} × ${boxes} box${boxes === 1 ? '' : 'es'}` : regions,
    lo <= hi && `range ${formatNumber(lo)} – ${formatNumber(hi)}`,
    res.unit ? `areas in ${res.unit}²` : 'pixel units',
    flagged > 0 && `${pct(flagged, signal)} of signal pixels flagged (ΔE > ${panel.settings.maxDeltaE})`,
  ]);
}

function th(text: string, rowhead = false) {
  const el = document.createElement('th');
  el.textContent = text;
  if (rowhead) el.className = 'rowhead';
  return el;
}

/** Rebuild the table: regions across, one row per box (or one row for single regions). */
export function fillRoiTable(table: HTMLTableElement, panel: Panel, res: Result, metric: keyof RoiStats) {
  if (!hasRows(res)) return table.replaceChildren();
  const model = roiTableModel(panel, res);
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  hr.append(th(ROI_METRIC_NAMES[metric], true), ...model.rois.map((r) => th(r.name)));
  thead.append(hr);
  const tbody = document.createElement('tbody');
  for (const row of model.rows) {
    const tr = document.createElement('tr');
    tr.append(th(row.label, true));
    for (const roi of model.rois) {
      const td = document.createElement('td');
      const r = row.cells.get(roi.id);
      if (r) {
        const value = metricValue(r.stats, metric);
        td.textContent = value === null ? '' : shortNumber(value);
        td.title = `${row.label} · ${roi.name}\nsum ${formatNumber(r.stats.sum)}\nmean ${formatNumber(r.stats.mean)}\nmax ${formatNumber(r.stats.max)}\nsignal ${r.stats.signalPx} of ${r.stats.areaPx} px`;
        // Outline when a noticeable share of the signal matched no colorbar color.
        if (r.stats.flaggedPx > 0.1 * r.stats.signalPx) td.classList.add('flagged');
      }
      if (row.row !== null) {
        td.dataset.r = String(row.row);
        td.dataset.c = String(row.col);
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.replaceChildren(thead, tbody);
}

function copy(w: WorkspaceContext, metric: keyof RoiStats) {
  const panel = w.activePanel();
  const res = w.resultFor(panel) as Result;
  if (hasRows(res)) void copyTable(w, roiWideTsv(panel, res, metricFor(metric, !!panel.scale)));
}

function download(w: WorkspaceContext, metric: keyof RoiStats, long: boolean) {
  const p = w.activePanel();
  const r = w.resultFor(p) as Result;
  if (!hasRows(r)) return;
  if (long) downloadCsv(w, p, roiCsv([{ panel: p, result: r }]), '_rois');
  else downloadCsv(w, p, roiWideCsv(p, r, metricFor(metric, !!p.scale)), '_rois_table');
}

function ResultTable({
  w,
  panel,
  res,
  metric,
}: {
  w: WorkspaceContext;
  panel: Panel;
  res: Result;
  metric: keyof RoiStats;
}) {
  const table = useRef<HTMLTableElement>(null);
  // While a handle is dragged the table waits for the drop, as the heatmap's does: rebuilding it on every move
  // took longer than a frame.
  const dragging = !!w.app.drag;
  // panel.rois names are part of the header: rebuild when the result object changes (it does for any edit).
  useLayoutEffect(() => {
    if (table.current && !dragging) fillRoiTable(table.current, panel, res, metric);
  }, [panel, res, metric, dragging]);

  useTableHover(w, table);

  return (
    <div className="table-wrap">
      <table
        id="roi-result-table"
        className="result-table"
        title="A cell is outlined when over 10% of its signal pixels matched no colorbar color"
        ref={table}
      />
    </div>
  );
}

export function RoiResultsCard() {
  const { w } = useWorkspace({ section: 'sec-roi-results' });
  const { state } = useRoiContext();
  const panel = w.activePanel();
  // Only the ROI tool shows this card; another tool's result has no regions.
  const res: Result = panel.tool === 'roi' ? (w.resultFor(panel) as Result) : { error: '' };
  const error = 'error' in res && res.error ? res.error : '';
  const metric = metricFor(state.metric, !!panel.scale);
  const summary = error || !hasRows(res) ? '' : roiSummary(panel, res, metric);
  const options = metricOptions(panel.scale?.unit ?? null);

  return (
    <>
      <CardHead
        title="Results"
        toggles={
          <Check
            id="toggle-mask"
            label="Show signal"
            title="Tint the pixels counted as signal"
            checked={state.showMask}
            onChange={(on) => {
              state.showMask = on;
              w.viewer.requestDraw();
              notify({ light: true });
            }}
          />
        }
      />
      <Notice id="roi-result-problem">{error}</Notice>
      <Hint id="roi-result-summary">{summary}</Hint>
      <Fields>
        <Field label="Measurement" title="The measurement the table, Download CSV and Copy table show">
          <BoundSelect
            id="result-metric"
            value={metric}
            onChange={(v) => {
              state.metric = v as keyof RoiStats;
              w.changed();
            }}
          >
            {options.map((o) => (
              <option
                key={o.value}
                value={o.value}
                data-scaled={o.scaled ? '' : undefined}
                disabled={o.scaled && !panel.scale}
              >
                {o.label}
              </option>
            ))}
          </BoundSelect>
        </Field>
      </Fields>
      <ResultTable w={w} panel={panel} res={res} metric={metric} />
      <MainStep
        id="roi-dl-csv"
        variant="primary"
        icon="download"
        title="One row per box, one column per region, as in the table"
        disabled={!!error}
        onClick={() => download(w, state.metric, false)}
      >
        Download CSV
      </MainStep>
      <SplitActions>
        <Btn
          id="roi-dl-long"
          icon="download"
          title="One line per region copy with every measurement"
          disabled={!!error}
          onClick={() => download(w, state.metric, true)}
        >
          Long CSV
        </Btn>
        <Btn
          id="roi-copy-tsv"
          icon="copy"
          title="Copy the table to paste into a spreadsheet"
          disabled={!!error}
          onClick={() => copy(w, state.metric)}
        >
          Copy table
        </Btn>
      </SplitActions>
    </>
  );
}
