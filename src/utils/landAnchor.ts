export interface Point {
  x: number;
  y: number;
}

/**
 * Where a landmark should stand on a country.
 *
 * The obvious answer - the outline's centroid - is wrong twice over. It is
 * averaged across every polygon, so outlying islands (Taiwan's Penghu, Kinmen
 * and Matsu) drag it off the mainland the landmark is meant to stand on, and
 * for a curved or forked landmass a centroid can fall in open water entirely.
 *
 * So: take the largest polygon, and find the point inside it that is furthest
 * from any coast. That point is always on land, and it is what the eye reads
 * as the middle of the country.
 */

/** Twice the signed area of a ring; sign gives its winding. */
export function ringArea(ring: readonly Point[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return sum / 2;
}

export function largestRing(rings: readonly (readonly Point[])[]): readonly Point[] | null {
  let best: readonly Point[] | null = null;
  let bestArea = -1;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const area = Math.abs(ringArea(ring));
    if (area > bestArea) {
      bestArea = area;
      best = ring;
    }
  }
  return best;
}

export function pointInRing(p: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from a point to a segment. */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance to the nearest edge. */
export function distanceToRing(p: Point, ring: readonly Point[]): number {
  let nearest = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const d = distanceToSegment(p, ring[i], ring[j]);
    if (d < nearest) nearest = d;
  }
  return nearest;
}

/** Distance to the nearest edge, negative outside the ring. */
export function signedDistance(p: Point, ring: readonly Point[]): number {
  const nearest = distanceToRing(p, ring);
  return pointInRing(p, ring) ? nearest : -nearest;
}

/** Centroid of a ring, used only as a last resort. */
export function ringCentroid(ring: readonly Point[]): Point {
  let x = 0;
  let y = 0;
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j].x * ring[i].y - ring[i].x * ring[j].y;
    area += cross;
    x += (ring[j].x + ring[i].x) * cross;
    y += (ring[j].y + ring[i].y) * cross;
  }
  if (area === 0) return { x: ring[0].x, y: ring[0].y };
  return { x: x / (3 * area), y: y / (3 * area) };
}

/** Grid resolution of the first pass, then of each refinement around the winner. */
const GRID = 24;
const REFINEMENTS = 4;

/**
 * The point of a ring furthest from its own edges, by grid search: scan a
 * coarse grid, then rescan a shrinking window around the best cell. That
 * converges quickly and, unlike a centroid, cannot land in the sea.
 */
export function poleOfInaccessibility(ring: readonly Point[]): Point {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  let best: Point = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  let bestDistance = -Infinity;
  let width = maxX - minX;
  let height = maxY - minY;
  let originX = minX;
  let originY = minY;

  for (let pass = 0; pass <= REFINEMENTS; pass++) {
    const stepX = width / GRID;
    const stepY = height / GRID;
    for (let i = 0; i <= GRID; i++) {
      for (let j = 0; j <= GRID; j++) {
        const candidate = { x: originX + i * stepX, y: originY + j * stepY };
        // Points in the water can never win, and the containment test is far
        // cheaper than measuring the distance to every edge.
        if (!pointInRing(candidate, ring)) continue;
        const distance = distanceToRing(candidate, ring);
        if (distance > bestDistance) {
          bestDistance = distance;
          best = candidate;
        }
      }
    }
    // A landmass thinner than the grid spacing can miss every sample; fall
    // back to its centroid rather than returning the middle of the bounds.
    if (bestDistance === -Infinity) return ringCentroid(ring);
    // Re-scan a window of a few cells around the winner.
    width = stepX * 3;
    height = stepY * 3;
    originX = best.x - width / 2;
    originY = best.y - height / 2;
  }

  return best;
}

/**
 * The anchor point for a country's outline: the deepest inland point of its
 * largest landmass, or the bare centre of the bounds if there is no ring.
 */
export function landAnchor(rings: readonly (readonly Point[])[]): Point | null {
  const ring = largestRing(rings);
  if (!ring) return null;
  return poleOfInaccessibility(ring);
}
