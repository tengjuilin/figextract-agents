// The Coordinates select, shared by the Profiles card (id profile-x) and the Results card (id map-units); both
// edit the panel's `map.units`. Options that are not available are disabled, and it shows `value`, what is
// reported (which may be a fallback from the setting).
import type { MapUnits, Panel } from '../../../types/index.ts';
import { BoundSelect } from '../../../ui/index.ts';
import { lengthPerPixel } from '../field.ts';

export function UnitsSelect({
  id,
  panel,
  hasAxis,
  value,
  onChange,
}: {
  id: string;
  panel: Panel;
  hasAxis: boolean;
  value: string;
  onChange: (units: MapUnits) => void;
}) {
  const scaled = lengthPerPixel(panel.scale) !== null;
  return (
    <BoundSelect id={id} value={value} onChange={(v) => onChange(v as MapUnits)}>
      <option value="axis" disabled={!hasAxis} title={hasAxis ? undefined : 'Needs ticks on the axes'}>
        Axis values
      </option>
      <option value="px">Pixels</option>
      <option value="length" disabled={!scaled} title={scaled ? `In ${panel.scale!.unit}` : 'Needs a scale bar'}>
        Scale bar
      </option>
    </BoundSelect>
  );
}
