import type { GalleryCountry, GalleryManifest, GalleryPhoto } from '../types/gallery';

export type Box = [number, number, number, number];

export function findCountry(
  manifest: GalleryManifest,
  id: string | null | undefined
): GalleryCountry | undefined {
  if (!id) return undefined;
  return manifest.countries.find((c) => c.id === id);
}

/**
 * Computes a zoomed SVG viewBox that frames `bbox` ([x0, y0, x1, y1]) with
 * `padding` x its size around it, preserving the aspect ratio of `base`
 * ([x, y, w, h]) so the map never stretches. Clamped to the base size.
 */
export function zoomViewBoxFor(bbox: Box, base: Box, padding = 2): Box {
  const [x0, y0, x1, y1] = bbox;
  const [bx, by, bw, bh] = base;
  const aspect = bw / bh;

  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let w = (x1 - x0) * (1 + padding);
  let h = (y1 - y0) * (1 + padding);

  // Grow the shorter side so the box matches the base aspect ratio.
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;

  if (w >= bw || h >= bh) return [bx, by, bw, bh];
  return [cx - w / 2, cy - h / 2, w, h];
}

/** Smallest box containing all of `boxes`, or null if there are none. */
export function unionBbox(boxes: readonly Box[]): Box | null {
  if (!boxes.length) return null;
  let [x0, y0, x1, y1] = boxes[0];
  for (const b of boxes.slice(1)) {
    x0 = Math.min(x0, b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]);
    y1 = Math.max(y1, b[3]);
  }
  return [x0, y0, x1, y1];
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatVisitedAt(visitedAt: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(visitedAt);
  if (!m) return visitedAt;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : visitedAt;
}

/** Where a photo sits on the 12-column grid from `md` up. */
export interface PhotoPlacement {
  /** Explicit, because a mirrored pair would otherwise wrap: the grid's
   * placement cursor never moves back to an earlier column within a row. */
  row: number;
  start: number;
  span: number;
  /** Stepped down, so a pair does not share a top edge. */
  offset: boolean;
}

function photoSpan({ width, height }: GalleryPhoto): number {
  const ratio = width / height;
  if (ratio >= 1.2) return 7;
  if (ratio <= 1 / 1.2) return 4;
  return 5;
}

/**
 * Packs photos two to a row where they fit, one where they do not. Pairs put
 * their first photo on alternating sides and singles alternate their indent,
 * so the stream zig-zags instead of stacking into columns.
 */
export function photoLayout(photos: readonly GalleryPhoto[]): PhotoPlacement[] {
  const layout: PhotoPlacement[] = [];
  let pairs = 0;
  let singles = 0;
  let row = 0;
  for (let i = 0; i < photos.length; ) {
    row++;
    const a = photoSpan(photos[i]);
    const b = i + 1 < photos.length ? photoSpan(photos[i + 1]) : null;
    if (b !== null && a + b <= 11) {
      const mirrored = pairs++ % 2 === 1;
      layout.push({ row, start: mirrored ? 13 - a : 1, span: a, offset: false });
      layout.push({ row, start: mirrored ? 1 : 13 - b, span: b, offset: true });
      i += 2;
    } else {
      const span = a + 1;
      layout.push({ row, start: singles++ % 2 === 0 ? 12 - span : 2, span, offset: false });
      i += 1;
    }
  }
  return layout;
}

export function photoAlt(photo: GalleryPhoto, country: string, index: number, total: number): string {
  return photo.alt || photo.caption || `${country}, photo ${index + 1} of ${total}`;
}

export interface BubbleSpot {
  /** From the screen's centre, in percent of its width. */
  x: number;
  /** From the screen's centre, in percent of its height. */
  y: number;
  /** Diameter, as a share of the largest bubble's. */
  size: number;
}

const BUBBLE_REACH = [1, 1.14, 1.05, 1.2, 1.09];
const BUBBLE_SIZE = [1, 0.66, 0.84, 0.58, 0.92, 0.72];
/** Nudges each bubble off its even share of the ring, as a share of that share. */
const BUBBLE_WOBBLE = [0, 0.12, -0.1, 0.06, -0.12, 0.1];

/** Scatters bubbles in a loose ring around the screen, leaving its middle clear for the words. */
export function bubbleSpots(count: number): BubbleSpot[] {
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i + 0.5 + BUBBLE_WOBBLE[i % BUBBLE_WOBBLE.length]) * step;
    const reach = BUBBLE_REACH[i % BUBBLE_REACH.length];
    return {
      x: Math.cos(angle) * 36 * reach,
      y: Math.sin(angle) * 30 * reach,
      size: BUBBLE_SIZE[i % BUBBLE_SIZE.length],
    };
  });
}
