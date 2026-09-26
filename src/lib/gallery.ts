import type { GalleryCountry, GalleryManifest, GalleryPhoto } from '@/types/gallery';

export type Box = [number, number, number, number];

export function findCountry(
  manifest: GalleryManifest,
  id: string | null | undefined
): GalleryCountry | undefined {
  if (!id) return undefined;
  return manifest.countries.find((c) => c.id === id);
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
  row: number;
  start: number;
  span: number;
  offset: boolean;
}

function photoSpan({ width, height }: GalleryPhoto): number {
  const ratio = width / height;
  if (ratio >= 1.2) return 7;
  if (ratio <= 1 / 1.2) return 4;
  return 5;
}

/** Lays out photos two per row where they fit, alternating sides so the grid zig-zags. */
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
/** Small angle offsets, so the bubbles aren't evenly spaced. */
const BUBBLE_WOBBLE = [0, 0.12, -0.1, 0.06, -0.12, 0.1];

/** Places bubbles in a loose ring, leaving the middle clear for the text. */
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
