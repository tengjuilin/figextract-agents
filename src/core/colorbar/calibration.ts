// Colorbar calibration: map positions along the bar (t in [0, 1], start →
// end) to data values via user ticks (scales, value functions). Sampling the
// bar and matching colors back to t (sampleColorbar, labToT, colorAtT,
// projectT, pointAtT) come from the colormeris package.
import { colormapSamples, sampleColorbar } from 'colormeris';
import type { Colorbar, ColorbarScale, PixelImage, TickWithT } from '../../types/index.ts';

export { colorAtT, DEFAULT_SAMPLES, labToT, pointAtT, projectT, sampleColorbar } from 'colormeris';

// Colorbar scales. "linear" and "log10" bars have their ticks on one
// straight line (in log10 for a log bar). "piecewise" bars do not: binned
// bars label bin boundaries with uneven values (1e4, 2e4, 2e5, 5e5 at even
// steps), so values are interpolated between neighbouring ticks only, and
// a check should not expect one line. "piecewise-log10" interpolates in
// log10 between neighbours. The value function is the same for a scale and
// its piecewise twin (it always goes tick to tick); the names tell checks
// and readers what the figure promises.
export const SCALES: ColorbarScale[] = ['linear', 'log10', 'piecewise', 'piecewise-log10'];
export const isLogScale = (scale: string) => scale === 'log10' || scale === 'piecewise-log10';
export const isPiecewiseScale = (scale: string) => scale === 'piecewise' || scale === 'piecewise-log10';

// The piecewise scale for a set of ticks: log10 between neighbours when
// every value is positive and they span at least two decades. Such labels
// (1e3, 2e3, 5e3, 1e4, 1e5) sit on a log-like axis, and a bin's geometric
// middle (6.3e4 for 2e4–2e5) is its middle on that axis; the arithmetic one
// (1.1e5) is not. Values with a 0 or a narrow range (0, 3, … 21) stay linear.
export function piecewiseScaleFor(ticks: { value: number }[]): ColorbarScale {
  const v = ticks.map((k) => k.value).filter(Number.isFinite);
  if (!v.length || v.some((x) => x <= 0)) return 'piecewise';
  return Math.max(...v) / Math.min(...v) >= 100 ? 'piecewise-log10' : 'piecewise';
}

// Validates ticks and returns a problem description, or null when usable.
export function tickProblem(ticks: TickWithT[], scale: string) {
  const valid = ticks.filter((k) => Number.isFinite(k.t) && Number.isFinite(k.value));
  if (valid.length < 2) return 'Add at least two ticks with numeric values.';
  if (isLogScale(scale) && valid.some((k) => k.value <= 0)) return 'Log scale needs positive tick values.';
  const ts = new Set(valid.map((k) => k.t.toFixed(6)));
  if (ts.size < 2) return 'Ticks must be at different positions along the bar.';
  if (isPiecewiseScale(scale)) {
    // Between neighbours only works when values rise (or fall) all along.
    const v = [...valid].sort((a, b) => a.t - b.t).map((k) => k.value);
    const steps = v.slice(1).map((x, i) => Math.sign(x - v[i]));
    if (steps.some((s) => s !== steps[0]) || !steps[0])
      return 'Piecewise scale needs tick values that rise or fall steadily along the bar.';
  }
  return null;
}

// Piecewise-linear t → value through the ticks, extrapolated linearly beyond
// the outermost ticks. With a log scale interpolation happens in log space.
export function makeValueFn(ticks: TickWithT[], scale: string = 'linear'): ((t: number) => number) | null {
  if (tickProblem(ticks, scale)) return null;
  const log = isLogScale(scale);
  const pts = ticks
    .filter((k) => Number.isFinite(k.t) && Number.isFinite(k.value))
    .map((k) => ({ t: k.t, y: log ? Math.log10(k.value) : k.value }))
    .sort((a, b) => a.t - b.t);
  // Collapse ticks at identical positions by averaging.
  const merged: { t: number; y: number; n: number }[] = [];
  for (const p of pts) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.t - p.t) < 1e-9) {
      last.y = (last.y * last.n + p.y) / (last.n + 1);
      last.n++;
    } else merged.push({ ...p, n: 1 });
  }
  return (t: number) => {
    let k = 0;
    while (k < merged.length - 2 && t > merged[k + 1].t) k++;
    const a = merged[k];
    const b = merged[k + 1];
    const y = a.y + ((t - a.t) / (b.t - a.t)) * (b.y - a.y);
    return log ? 10 ** y : y;
  };
}

// The colorbar's samples: from its known colormap when it has one (see
// colormapSamples, imported from core/colormap-match.ts), else
// read from the image along the bar line.
export function colorbarSamples(img: PixelImage, cb: Colorbar) {
  if (cb.colormap) return colormapSamples(cb.colormap, cb.nSamples) || [];
  return sampleColorbar(img, cb.start!, cb.end!, cb.halfWidth, cb.nSamples);
}
