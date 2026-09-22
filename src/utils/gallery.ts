import type { GalleryCountry, GalleryManifest } from '../types/gallery';

type Box = [number, number, number, number];

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
