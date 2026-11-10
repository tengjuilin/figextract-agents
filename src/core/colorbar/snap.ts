// Snapping rough tick placements onto the tick marks along a colorbar
// (snapTick). refineColorbar (the strip and its ends) comes from the
// colormeris package; the helpers below are the same as there.

import { deltaE76, median, rgbToLab } from 'colormeris';
import type { Lab, PixelImage, Point } from '../../types/index.ts';
import { readPixel } from '../grid.ts';

export { type RefinedColorbar, refineColorbar } from 'colormeris';

// An LLM reading coordinates off images places the colorbar and its ticks
// a few pixels off: the line drifts towards the strip's edge, the ends land
// on the outline or short of the last color, and ticks miss their marks.
// snapTick finds the real tick marks near a rough placement. Color steps
// are ΔE76 in CIELAB.

const SIDE_EDGE = 15; // sideways step that counts as leaving the strip
const MAX_SIDE = 60; // widest half-strip searched, in pixels
const MIN_LEN = 10; // shortest line (pixels) worth refining or snapping on
// snapTick: marks are searched within TICK_REACH of the bar's length (and
// 4 px more) of the rough point, and are thinner than MAX_MARK pixels.
const TICK_REACH = 0.04;
const MAX_MARK = 8;
const labAt = (img: PixelImage, p: Point) => rgbToLab(readPixel(img, p.x, p.y));

function axes(start: Point, end: Point) {
  const len = Math.hypot(end.x - start.x, end.y - start.y);
  const u = { x: (end.x - start.x) / len, y: (end.y - start.y) / len };
  const n = { x: -u.y, y: u.x };
  // Page point at s pixels along the bar from start and k pixels across it.
  const at = (s: number, k = 0): Point => ({ x: start.x + s * u.x + k * n.x, y: start.y + s * u.y + k * n.y });
  return { len, u, n, at };
}

// How far the strip reaches on each side of the line (last pixel that still
// has the line's color), as medians over the middle of the bar. A colorbar
// has one color across its width, so the first big sideways step is its edge.
function stripSides(img: PixelImage, start: Point, end: Point) {
  const { len, at } = axes(start, end);
  const lo: number[] = [];
  const hi: number[] = [];
  const centre: Lab[] = [];
  for (let i = 0; i < 15; i++) {
    const s = len * (0.2 + (0.6 * i) / 14);
    const c = labAt(img, at(s));
    centre.push(c);
    const reach = (dir: number) => {
      let k = 0;
      while (k < MAX_SIDE && deltaE76(labAt(img, at(s, dir * (k + 1))), c) < SIDE_EDGE) k++;
      return k;
    };
    lo.push(reach(-1));
    hi.push(reach(1));
  }
  // A colorbar changes color along its length; a flat line is not on one.
  let spread = 0;
  for (const c of centre) spread = Math.max(spread, deltaE76(c, centre[0]));
  return { lo: median(lo), hi: median(hi), spread };
}

// Tick mark nearest `at` on a colorbar (start → end on the strip's centre
// line). Marks are short lines across the bar's edge: outside it (dark on
// the background) or drawn into the strip from its edge (off the strip's
// color there). Returns {t, moved (pixels along the bar), point} or null
// when no clear mark is near.
export function snapTick(
  img: PixelImage,
  start: Point,
  end: Point,
  at: Point,
): { t: number; moved: number; point: Point } | null {
  const { len, u, at: pt } = axes(start, end);
  if (len < MIN_LEN) return null;
  const s0 = (at.x - start.x) * u.x + (at.y - start.y) * u.y;
  const W = Math.max(4, Math.round(len * TICK_REACH));
  const from = Math.round(s0 - W - 4);
  const to = Math.round(s0 + W + 4);
  const { lo, hi } = stripSides(img, start, end);
  const bands: { ks: number[]; min: number; outside: boolean }[] = [];
  for (const [dir, edge] of [
    [-1, lo],
    [1, hi],
  ]) {
    if (edge >= MAX_SIDE) continue;
    const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => dir * (a + i));
    // Outside: the background dominates the band, marks stand out from it.
    bands.push({ ks: range(edge + 2, edge + 9), min: 3, outside: true });
    // Inside: the strip has one color across, so a mark differs from the centre.
    if (edge >= 3) bands.push({ ks: range(Math.max(1, edge - 6), edge), min: 2, outside: false });
  }
  let best: number | null = null;
  for (const band of bands) {
    const rows: Lab[][] = [];
    for (let s = from; s <= to; s++) rows.push(band.ks.map((k) => labAt(img, pt(s, k))));
    let refAt: (i: number) => Lab;
    if (band.outside) {
      const ref = [0, 1, 2].map((i) => median(rows.flat().map((l) => l[i])));
      refAt = () => ref;
    } else refAt = (i: number) => labAt(img, pt(from + i, 0));
    const limit = band.outside ? 25 : 20;
    const profile = rows.map((row, i) => row.filter((l) => deltaE76(l, refAt(i)) > limit).length);
    const base = median(profile);
    // Runs of positions where the band holds a mark; marks are thin.
    let run: { from: number; to: number; sum: number; weight: number } | null = null;
    const flush = () => {
      if (!run) return;
      const centre = run.sum / run.weight;
      if (
        run.to - run.from < MAX_MARK &&
        Math.abs(centre - s0) <= W &&
        (!best || Math.abs(centre - s0) < Math.abs(best - s0))
      )
        best = centre;
      run = null;
    };
    profile.forEach((v, i) => {
      const x = v - base;
      if (x < band.min) return flush();
      const s = from + i;
      run ??= { from: s, to: s, sum: 0, weight: 0 };
      run.to = s;
      run.sum += s * x;
      run.weight += x;
    });
    flush();
  }
  if (best === null) return null;
  return { t: best / len, moved: Math.round((best - s0) * 10) / 10, point: pt(best) };
}
