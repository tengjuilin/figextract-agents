// Matching pane of the Settings dialog: how colors are matched to the colorbar, per tool. Changing a value
// applies it to every panel of that tool in the open project (ws.applyMatching, Undo reverts it).
import type { MatchingSettings, ToolKind } from '../../types/index.ts';
import {
  Actions,
  BoundInput,
  BoundSelect,
  Btn,
  Field,
  Fields,
  Notice,
  parseNumber,
  useSettings,
} from '../../ui/index.ts';
import { MATCHING_DEFAULTS } from './settings.ts';
import { useSettingsCtl } from './settings-ctl.ts';

const DISTANCES = [
  { value: 'de2000', label: 'CIEDE2000' },
  { value: 'de76', label: 'CIE76', title: 'Euclidean distance in CIELAB' },
];

const DISTANCE_TITLE = 'How the distance between a color and the colorbar colors is measured';

// Panels of the open project can differ (an opened zip, or the agent's set_settings).
export function matchingNote(
  panels: { tool: ToolKind; settings: object }[],
  matching: Record<ToolKind, MatchingSettings>,
): string {
  const parts: string[] = [];
  for (const [kind, label] of [
    ['heatmap', 'heatmap'],
    ['roi', 'ROI'],
    ['map', 'map'],
  ] as const) {
    const m = matching[kind];
    const n = panels.filter(
      (p) => p.tool === kind && Object.entries(m).some(([k, v]) => (p.settings as Record<string, unknown>)[k] !== v),
    ).length;
    if (n) parts.push(`${n} ${label} panel${n === 1 ? '' : 's'}`);
  }
  const list = parts.length > 2 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join(' and ');
  return parts.length
    ? `In the open project, ${list} use other values. They keep them until you change a value of that tool here.`
    : '';
}

export function MatchingPane() {
  const ctl = useSettingsCtl();
  const { settings } = useSettings();
  const { app } = ctl.ws;

  function setMatching(kind: ToolKind, key: string, value: unknown) {
    (ctl.settings.matching[kind] as unknown as Record<string, unknown>)[key] = value;
    ctl.ws.applyMatching(kind, ctl.settings.matching[kind]);
    ctl.changed();
  }
  const number = (kind: ToolKind, key: string, lo: number, hi: number) => (text: string) => {
    const v = parseNumber(text);
    if (v !== null) setMatching(kind, key, Math.min(hi, Math.max(lo, v)));
  };
  const distance = (kind: ToolKind, id: string, title: string) => (
    <Field label="Color difference" title={title}>
      <BoundSelect
        id={id}
        value={settings.matching[kind].distance}
        options={DISTANCES}
        onChange={(v) => setMatching(kind, 'distance', v)}
      />
    </Field>
  );
  const maxDe = (kind: ToolKind, id: string, title: string) => (
    <Field label="Flag colors with ΔE above" title={title}>
      <BoundInput
        id={id}
        kind="number"
        min={0}
        step={0.5}
        className="num"
        value={settings.matching[kind].maxDeltaE}
        onCommit={number(kind, 'maxDeltaE', 0, 1000)}
      />
    </Field>
  );

  const note = app.sourceCanvas ? matchingNote(app.project.panels, settings.matching) : '';
  return (
    <>
      <Notice id="matching-note">{note}</Notice>
      <fieldset>
        <legend>Heatmap</legend>
        <Fields>
          {distance('heatmap', 'set-hm-distance', DISTANCE_TITLE)}
          {maxDe(
            'heatmap',
            'set-hm-maxde',
            'Cells whose color is further than this from every colorbar color are flagged (outlined in red)',
          )}
        </Fields>
      </fieldset>
      <fieldset>
        <legend>ROI</legend>
        <Fields>
          <Field
            label="Gray background up to chroma"
            title="Pixels whose color is nearly gray (CIELAB chroma at or below this) are background with no signal"
          >
            <BoundInput
              id="set-roi-gray"
              kind="number"
              min={0}
              max={60}
              step={1}
              className="num"
              value={settings.matching.roi.grayChroma ?? 0}
              onCommit={number('roi', 'grayChroma', 0, 60)}
            />
          </Field>
          {distance('roi', 'set-roi-distance', DISTANCE_TITLE)}
          {maxDe(
            'roi',
            'set-roi-maxde',
            'Colored pixels further than this from every colorbar color (colored text, for example) count as signal but are flagged',
          )}
        </Fields>
      </fieldset>
      <fieldset>
        <legend>Map</legend>
        <Fields>
          {distance('map', 'set-map-distance', `${DISTANCE_TITLE}. CIE76 is about 10× faster on large maps.`)}
          {maxDe(
            'map',
            'set-map-maxde',
            'Values further than this from every colorbar color are shown in red under Show flags',
          )}
        </Fields>
      </fieldset>
      <Actions>
        <Btn
          variant="danger"
          icon="reset"
          id="matching-reset"
          title="Back to the default matching of every tool"
          onClick={() => {
            for (const [kind, defs] of Object.entries(MATCHING_DEFAULTS) as [ToolKind, MatchingSettings][]) {
              ctl.settings.matching[kind] = { ...defs };
              ctl.ws.applyMatching(kind, ctl.settings.matching[kind]);
            }
            ctl.changed();
          }}
        >
          Reset all matching
        </Btn>
      </Actions>
    </>
  );
}
