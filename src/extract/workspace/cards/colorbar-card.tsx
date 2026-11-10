// The Colorbar card: ends, the tick table, the sampled strip and the suggested reference colormap. The colors
// come from the bar in the figure or from a known colormap (colorbar.colormap, picked with the colormap viewer's
// picker); with a known colormap the bar line is optional and ticks can be typed as a position along the map.
// Read in render, write in handlers that end in w.commit / w.changed (docs/react.md, "The card pattern"). Moving the focus to a
// new tick goes through tick-focus.ts; the sampled strip and the reference match are their own components.
import type { BarTickMode, ColorbarScale } from '../../../types/index.ts';
import {
  BoundInput,
  BoundSelect,
  Btn,
  CardHead,
  Check,
  Field,
  Fields,
  IconBtn,
  MainStep,
  Options,
  SplitActions,
} from '../../../ui/index.ts';
import { ticksWithT } from '../../project/project.ts';
import { useBoundNumber } from '../../react/use-bound.ts';
import { useWorkspace } from '../../react/use-workspace.ts';
import { notify } from '../store.ts';
import { BarMatch, lowAtStartOf, useBarMatch } from './bar-match.tsx';
import { BarStrip } from './bar-strip.tsx';
import {
  chooseColormap,
  hasColorbar,
  placeColorbarEnds,
  removeColorbar,
  toggleTickMode,
  typeTick,
} from './colorbar-actions.ts';
import { MapPicker } from './map-picker.tsx';
import { TickTable } from './tick-table.tsx';

const SCALES: { value: ColorbarScale; label: string; title?: string }[] = [
  { value: 'linear', label: 'Linear', title: 'Values change evenly along the colorbar' },
  { value: 'log10', label: 'Log10', title: 'Values change by decades; type the tick values as raw numbers, not logs' },
  {
    value: 'piecewise',
    label: 'Piecewise',
    title: 'Uneven tick values, e.g. a binned colorbar: values are interpolated between neighboring ticks',
  },
  {
    value: 'piecewise-log10',
    label: 'Piecewise log10',
    title: 'Uneven positive tick values over decades: log10 between neighboring ticks',
  },
];

const TICK_MODES: { value: BarTickMode; label: string }[] = [
  { value: 'follow', label: 'Move with bar' },
  { value: 'fixed', label: 'Stay on page' },
];

export function ColorbarCard() {
  const { w } = useWorkspace({ section: 'sec-colorbar' });
  const { app } = w;
  const panel = w.activePanel();
  const cb = panel.colorbar;
  const ticks = ticksWithT(cb);
  const validTicks = ticks.filter((k) => Number.isFinite(k.value) && Number.isFinite(k.t)).length;
  const known = !!cb.colormap;
  const ready = !!cb.start || known;
  const ticksText = `${validTicks} tick${validTicks === 1 ? '' : 's'}`;
  const badge = !ready
    ? 'not placed'
    : known
      ? `${cb.colormap!.name}${cb.colormap!.reversed ? '_r' : ''} · ${ticksText}`
      : ticksText;

  const match = useBarMatch(w, panel);
  const halfWidth = useBoundNumber((p, v) => {
    p.colorbar.halfWidth = Math.min(50, Math.max(0, v));
  });

  function setSource(source: string) {
    if (source === 'figure') return w.commit((p) => (p.colorbar.colormap = null));
    // Start from the map the bar was matched to, if any, else viridis. The first end's value gets the focus
    // (chooseColormap), not the picker: focused, the picker opens its list over the tick table.
    const m = match && match.level !== 'none' ? match : null;
    chooseColormap(w, m ? m.name : 'viridis', m ? m.reversed : false);
  }

  return (
    <>
      <CardHead
        title={
          <>
            <span className="step-dot bar-dot" />
            Colorbar
          </>
        }
        badge={{ id: 'bar-state', text: badge, ok: ready && validTicks >= 2 }}
        actions={
          <IconBtn
            id="bar-remove"
            variant="danger"
            icon="trash"
            label="Remove the colorbar"
            disabled={!hasColorbar(cb)}
            onClick={() => removeColorbar(w)}
          />
        }
      />
      <MainStep
        id="bar-place"
        variant="primary"
        icon="place"
        hotkey="colorbar"
        title="Click the two ends of the colorbar. Shortcut: {key}"
        pressed={app.mode?.type === 'colorbar'}
        onClick={() => placeColorbarEnds(w)}
      >
        Place colorbar ends
      </MainStep>
      <SplitActions>
        <Btn
          id="tick-add"
          icon="plus"
          hotkey="ticks"
          title="Click tick marks on the colorbar, then type their values. Shortcut: {key}"
          disabled={!cb.start}
          pressed={app.mode?.type === 'tick'}
          onClick={() => toggleTickMode(w)}
        >
          Add ticks
        </Btn>
        <Btn
          id="tick-type"
          icon="type"
          disabled={!ready}
          title="Add a tick by typing its value and its position in % along the colorbar (0% at the start, 100% at the end)"
          onClick={() => typeTick(w)}
        >
          Type a tick
        </Btn>
      </SplitActions>
      <Fields>
        <Field
          label="Colors"
          title="Read the colors from the colorbar in the figure, or from a known colormap when the figure's bar is missing, small or compressed"
        >
          <BoundSelect
            id="bar-source"
            value={known ? 'colormap' : 'figure'}
            options={[
              { value: 'figure', label: 'Colorbar in the figure' },
              { value: 'colormap', label: 'Known colormap' },
            ]}
            onChange={setSource}
          />
        </Field>
      </Fields>
      <Fields id="bar-cmap" className="bar-cmap" hidden={!known}>
        <Field as="div" label="Colormap">
          <div id="bar-cmap-pick">
            <MapPicker
              id="bar-cmap-picker"
              label="Colormap"
              value={cb.colormap?.name ?? null}
              onChoose={(name, typedReversed) =>
                chooseColormap(w, name, typedReversed || !!w.activePanel().colorbar.colormap?.reversed)
              }
            />
          </div>
        </Field>
        <Check
          id="bar-cmap-rev"
          label="Reversed"
          title="Run the colormap from its end to its start"
          checked={!!cb.colormap?.reversed}
          onChange={(on) => {
            if (w.activePanel().colorbar.colormap)
              w.commit((p) => (p.colorbar.colormap = { ...p.colorbar.colormap!, reversed: on }));
          }}
        />
      </Fields>
      <BarStrip w={w} panel={panel} />
      <BarMatch
        match={match}
        lowAtStart={lowAtStartOf(panel)}
        onUse={(m) => w.commit((p) => (p.colorbar.colormap = { name: m.name, reversed: m.reversed }))}
      />
      <TickTable w={w} ticks={ticks} />
      <Fields>
        <Field label="Scale" title="How tick values map to positions along the colorbar">
          <BoundSelect
            id="bar-scale"
            value={cb.scale}
            options={SCALES}
            onChange={(v) => w.commit((p) => (p.colorbar.scale = v as ColorbarScale))}
          />
        </Field>
      </Fields>
      <Options summary="Options">
        <Fields>
          <Field
            label="Width (± px)"
            title="Colors are averaged over this many pixels on each side of the colorbar line"
          >
            {/* Any step: rescaling a project (resolution) leaves fractional widths, which step={1} would mark
                invalid; the arrows still step by 1. Shown to one decimal. */}
            <BoundInput
              key={panel.id}
              id="bar-halfwidth"
              kind="number"
              min={0}
              max={50}
              step="any"
              value={Math.round(cb.halfWidth * 10) / 10}
              {...halfWidth}
            />
          </Field>
          <Field
            label="Ticks on end drag"
            title="What happens to the ticks when you drag an end of the colorbar: move with the bar and keep their proportions, or stay on their marks on the page. Drag the line itself to move everything together."
          >
            <BoundSelect
              id="bar-tick-mode"
              value={app.barTickMode}
              options={TICK_MODES}
              onChange={(v) => {
                // Read by interact.ts on the next drag; nothing to redraw.
                app.barTickMode = v as BarTickMode;
                notify({ light: true });
              }}
            />
          </Field>
        </Fields>
      </Options>
    </>
  );
}
