// The Map tool's Results card: the value summary, the coordinate units, the matrix downloads and Copy table,
// the bin size (under Options) and the Show reconstruction / Show flags toggles (which only change the
// drawing). Read in render, write in handlers (docs/react.md, "The card pattern").
import type { MapField, MapResult, Panel } from '../../../types/index.ts';
import {
  BoundInput,
  Btn,
  CardHead,
  Check,
  Field,
  Fields,
  Hint,
  MainStep,
  Notice,
  Options,
  SplitActions,
} from '../../../ui/index.ts';
import { formatNumber, mapLongCsv, mapMatrixCsv, mapMatrixTsv } from '../../project/project-files.ts';
import { useBoundNumber } from '../../react/use-bound.ts';
import { useWorkspace } from '../../react/use-workspace.ts';
import { copyTable, downloadCsv } from '../../results-actions.ts';
import { joinSummary, pct } from '../../results-summary.ts';
import { notify } from '../../workspace/store.ts';
import { axisFn, coordKind, mapSize } from '../field.ts';
import { useMapTool } from './map-context.ts';
import { UnitsSelect } from './units-select.tsx';

type Field_ = MapField & { axisProblems?: string[] };

function summaryText(res: Field_, panel: Panel): string {
  const s = res.stats;
  const clipped = s.clippedLow + s.clippedHigh;
  const total = res.values.length;
  return joinSummary([
    `${res.cols} × ${res.rows} values`,
    `range ${formatNumber(s.min)} – ${formatNumber(s.max)}`,
    `colorbar resolves about ${s.levels} levels`,
    s.flagged > 0 && `${s.flagged} flagged (${pct(s.flagged, total)}, ΔE > ${panel.settings.maxDeltaE})`,
    clipped > 0 && `${clipped} at a colorbar end (${pct(clipped, total)}, may be clipped)`,
  ]);
}

export function MapResultsCard() {
  const { w } = useWorkspace({ section: 'sec-map-results' });
  const { state } = useMapTool();
  const panel = w.activePanel();
  // A render queued before a tool switch can see another tool's panel; its result is not a map field.
  const isMap = panel.tool === 'map';
  const res = (isMap ? w.resultFor(panel) : { error: '' }) as Field_;
  const axisFns = (['x', 'y'] as const).map((k) => !!(panel.grid.corners && axisFn(panel, k).fn));
  const hasAxis = axisFns.some(Boolean);
  const bin = useBoundNumber((p, v) => {
    p.map.bin = Math.min(256, Math.max(1, Math.round(v)));
  });
  // One setting for the profile plot and the matrix, edited from either card.
  const setUnits = (units: Panel['map']['units']) =>
    w.commit((p) => {
      p.map.units = units;
    });
  const download = (long: boolean) => {
    const p = w.activePanel();
    const r = w.resultFor(p) as MapResult;
    if (r.error) return;
    if (long) downloadCsv(w, p, mapLongCsv([{ panel: p, result: r }]), '_map_long');
    else downloadCsv(w, p, mapMatrixCsv(p, r as MapField), '_map');
  };
  const copy = () => {
    const p = w.activePanel();
    const r = w.resultFor(p) as MapResult;
    if (!r.error) void copyTable(w, mapMatrixTsv(p, r as MapField));
  };
  const toggle = (key: 'showRecon' | 'showFlags', on: boolean) => {
    // Only the drawing changes: redraw, and re-render the toggle (no project change, no listeners).
    state[key] = on;
    w.viewer.requestDraw();
    notify({ light: true });
  };
  return (
    <>
      <CardHead
        title="Results"
        toggles={
          <>
            <Check
              id="map-recon"
              label="Show reconstruction"
              title="Paint the extracted values back over the figure"
              checked={state.showRecon}
              onChange={(on) => toggle('showRecon', on)}
            />
            <Check
              id="map-flags"
              label="Show flags"
              title="Red: color far from the colorbar (ΔE). Magenta / cyan: at the top / bottom end of the colorbar, possibly clipped. Colors can be changed in Settings."
              checked={state.showFlags}
              onChange={(on) => toggle('showFlags', on)}
            />
          </>
        }
      />
      <Notice id="map-problem">{res.error || ''}</Notice>
      <Notice id="map-axis-hint">{res.axisProblems?.join(' ') || ''}</Notice>
      <Hint id="map-summary">
        {res.error || !('stats' in res)
          ? isMap && panel.grid.corners
            ? sizeText(panel)
            : ''
          : summaryText(res, panel)}
      </Hint>
      <Fields>
        <Field
          label="Coordinates"
          title="How x and y are reported in the CSVs and the status bar: axis values (with axis ticks), pixels from the plot's top-left corner, or scale-bar lengths from that corner. Shared with the profile plot's X axis."
        >
          {/* With one axis calibrated, 'axis' reports the other in length or pixels. */}
          <UnitsSelect
            id="map-units"
            panel={panel}
            hasAxis={hasAxis}
            value={hasAxis && panel.map.units === 'axis' ? 'axis' : coordKind(panel, 'x')}
            onChange={setUnits}
          />
        </Field>
      </Fields>
      <MainStep
        id="map-dl-csv"
        variant="primary"
        icon="download"
        title="The value matrix: one row per bin row, one column per bin column"
        disabled={!!res.error}
        onClick={() => download(false)}
      >
        Download CSV
      </MainStep>
      <SplitActions>
        <Btn
          id="map-dl-long"
          icon="download"
          title="One line per bin with its coordinates, ΔE and flags"
          disabled={!!res.error}
          onClick={() => download(true)}
        >
          Long CSV
        </Btn>
        <Btn
          id="map-copy-tsv"
          icon="copy"
          title="Copy the table to paste into a spreadsheet"
          disabled={!!res.error}
          onClick={copy}
        >
          Copy table
        </Btn>
      </SplitActions>
      <Options summary="Options" note={`bin ${panel.map.bin} px`}>
        <Fields>
          <Field
            label="Bin size (px)"
            title="Side of the square bins in pixels of the rendered image; each bin is the median of its pixels. 1 = one value per pixel."
          >
            <BoundInput
              key={panel.id}
              id="map-bin"
              kind="number"
              min={1}
              max={256}
              step={1}
              value={panel.map.bin}
              {...bin}
            />
          </Field>
        </Fields>
      </Options>
    </>
  );
}

function sizeText(panel: Panel) {
  const { rows, cols } = mapSize(panel);
  return `${cols} × ${rows} values at this bin size`;
}
