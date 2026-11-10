// How every Results card writes its one-line summary (docs/ui.md, section 7): segments joined by " · ",
// shares as percentages with one decimal, and "<0.1%" for a share too small to show but not zero.

/** `part` of `total` as "12.5%", "<0.1%" or "0%". */
export function pct(part: number, total: number) {
  if (!part || !(total > 0)) return '0%';
  const share = (100 * part) / total;
  return share < 0.1 ? '<0.1%' : `${share.toFixed(1)}%`;
}

/** Joins the non-empty segments of a summary with " · "; no final period. */
export function joinSummary(segments: (string | false | null | undefined)[]) {
  return segments.filter(Boolean).join(' · ');
}
