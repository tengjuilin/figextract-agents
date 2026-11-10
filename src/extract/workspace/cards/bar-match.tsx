// Which known colormap the calibrated colorbar looks like (suggestColormap from colormeris), shown under the strip.
// Matching takes about 30 ms (identifyColorbar with `within` skips maps that cannot win), waits until the bar
// stops moving and is cached per bar position; the tick values only decide the direction. The result goes into a
// module cache and a state bump re-renders the card.
import { cmapData, suggestColormap } from 'colormeris';
import { useEffect, useState } from 'react';
import { makeValueFn, sampleColorbar } from '../../../core/colorbar.ts';
import type { Panel, WorkspaceContext } from '../../../types/index.ts';
import { Btn, Hint } from '../../../ui/index.ts';
import { ticksWithT } from '../../project/project.ts';

export type BarMatchResult = ReturnType<typeof suggestColormap>;

// The last match only, as before: moving the bar back to a place it was does not recompute.
let cache: { key: string; result: BarMatchResult } | null = null;

/** Test hook: forget the cached match. */
export function resetBarMatchCache() {
  cache = null;
}

/**
 * The latest match while the panel has a bar and no known colormap, else null. After the bar moves, the previous
 * match stays shown until the new one is computed, as before.
 */
export function useBarMatch(w: WorkspaceContext, panel: Panel): BarMatchResult {
  const cb = panel.colorbar;
  const ready = !!cb.start && !!cb.end && !!w.app.pages.get(panel.page)?.imageData && !cb.colormap;
  const key = ready ? JSON.stringify([panel.page, cb.start, cb.end, cb.halfWidth]) : null;
  const [, bump] = useState(0);
  const panelId = panel.id;
  useEffect(() => {
    if (!key || cache?.key === key) return;
    const timer = setTimeout(() => {
      const p = w.app.project.panels.find((x) => x.id === panelId);
      const image = p && w.app.pages.get(p.page)?.imageData;
      if (!p?.colorbar.start || !p.colorbar.end || !image) return;
      const rgbs = sampleColorbar(image, p.colorbar.start, p.colorbar.end, p.colorbar.halfWidth, 128).map((s) => s.rgb);
      // Match start → end once; the ticks flip the direction afterwards.
      cache = { key, result: suggestColormap(rgbs) };
      bump((n) => n + 1);
    }, 250);
    return () => clearTimeout(timer);
  }, [key, panelId, w]);
  // Never another panel's or an older bar's match: hide it until this key's match is computed.
  return ready && cache?.key === key ? cache.result : null;
}

/** True when the first end is where the values start; null while the ticks do not say. */
export function lowAtStartOf(panel: Panel): boolean | null {
  const valueAt = makeValueFn(ticksWithT(panel.colorbar), panel.colorbar.scale);
  return valueAt ? valueAt(0) < valueAt(1) : null;
}

export function BarMatch({
  match: m,
  lowAtStart,
  onUse,
}: {
  match: BarMatchResult;
  lowAtStart: boolean | null;
  onUse: (m: NonNullable<BarMatchResult>) => void;
}) {
  // Always in the DOM (empty, it collapses), so the live region is there to announce the match when it arrives.
  if (!m) return <Hint id="bar-match" className="bar-match" aria-live="polite" />;
  const reversed = lowAtStart === false ? !m.reversed : m.reversed;
  const name = `${m.name}${reversed ? '_r' : ''}`;
  const dirTitle =
    lowAtStart == null ? 'Direction from the first end you placed; add ticks to read it by value' : undefined;
  const score = `ΔE ${m.score.toFixed(1)}`;
  const flip = (n: string) => (lowAtStart === false ? (n.endsWith('_r') ? n.slice(0, -2) : `${n}_r`) : n);
  const lib = cmapData.sources.find((s) => s.key === m.source)?.label || m.source;
  const code = <code title={dirTitle}>{name}</code>;
  return (
    <Hint id="bar-match" className={`bar-match ${m.level}`} aria-live="polite">
      {m.level === 'exact' ? (
        <>
          Reference colormap: {code}
          {` (${lib}, ${score}). `}
        </>
      ) : m.level === 'close' ? (
        <>
          Closest colormap: {code}
          {` (${score}): similar, but not the same map. `}
        </>
      ) : (
        <>
          No known colormap matches this colorbar (closest: <code>{name}</code>
          {`, ${score}). `}
        </>
      )}
      {m.level !== 'none' && m.same.length ? `Same colors: ${m.same.map(flip).join(', ')}. ` : null}
      {m.level !== 'none' ? (
        // Use the matched map's own colors instead of the sampled bar: same direction as the bar
        // (m.reversed is start → end), ticks unchanged.
        <Btn
          variant="subtle"
          icon="layers"
          title={`Read the colors from ${m.name} itself instead of the colorbar in the figure`}
          onClick={() => onUse(m)}
        >
          Use colormap colors
        </Btn>
      ) : null}
    </Hint>
  );
}
