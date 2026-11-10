// Geometry, colors and pixel buffers shared by every module. Coordinates are
// page pixels of the rendered page image unless a comment says otherwise.

/** A point in page pixels (or box coordinates for replicated ROIs). */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned box in page pixels (locate.ts, agent/decide.ts). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Normalized position inside a grid: u along columns, v along rows, [0, 1] inside. */
export interface UV {
  u: number;
  v: number;
}

/**
 * Four grid points in the order [topLeft, topRight, bottomRight, bottomLeft].
 * An array rather than a tuple: the code maps and rebuilds corners freely.
 */
export type Corners = Point[];

// Colors and pixel buffers: Rgb ([r, g, b], 0–255), Lab (CIELAB), PixelImage
// (row-major RGBA, ImageData fits) and DistanceName, from the colormeris package.
export type { DistanceName, Lab, PixelImage, Rgb } from 'colormeris';
