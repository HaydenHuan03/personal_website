import { pointInRing, type Point } from './landAnchor';

/**
 * Finding which country is under the pointer. The globe is one textured
 * sphere, so the hit point is turned into a pixel on the flat world image and
 * tested against the country outlines that image was drawn from.
 */

/** A position on the flat world image, in its own coordinates. */
export type TexturePoint = Point;

/** What a country needs for a point to be tested against it. */
interface CountryOutline {
  id: string;
  d: string;
  bbox: [number, number, number, number];
}

/** Plus the centroid, for near-miss picking. */
interface PickableCountry extends CountryOutline {
  centroid: [number, number];
}

type Ring = Point[];

const ringCache = new WeakMap<CountryOutline, Ring[]>();

/** Splits SVG path data into rings. d3-geo only writes M, L and Z, so splitting on them is enough. */
function parseRings(d: string): Ring[] {
  const rings: Ring[] = [];
  for (const part of d.split('M')) {
    if (!part) continue;
    const ring: Ring = [];
    for (const pair of part.replace(/Z/gi, '').split('L')) {
      const comma = pair.indexOf(',');
      if (comma < 0) continue;
      const x = Number(pair.slice(0, comma));
      const y = Number(pair.slice(comma + 1));
      if (Number.isFinite(x) && Number.isFinite(y)) ring.push({ x, y });
    }
    // Fewer than 3 points has no area.
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** The texture uv of a point on the sphere, matching three's SphereGeometry (v is 0 at the south pole). */
export function sphereUv(point: Vec3, radius: number): [number, number] {
  const theta = Math.acos(Math.min(1, Math.max(-1, point.y / radius)));
  const v = 1 - theta / Math.PI;
  let u = Math.atan2(point.z, -point.x) / (Math.PI * 2);
  if (u < 0) u += 1;
  if (u >= 1) u -= 1;
  return [u, v];
}

/** The image position for a uv. Texture v runs up, image y runs down. */
export function uvToTexture(
  u: number,
  v: number,
  viewBox: readonly [number, number, number, number]
): TexturePoint {
  const [x0, y0, width, height] = viewBox;
  return { x: x0 + u * width, y: y0 + (1 - v) * height };
}

/** The country covering `point`, or null. Bounding boxes are checked first to skip most countries quickly. */
function countryAt(
  point: TexturePoint,
  countries: readonly CountryOutline[]
): string | null {
  for (const country of countries) {
    const [x0, y0, x1, y1] = country.bbox;
    if (point.x < x0 || point.x > x1 || point.y < y0 || point.y > y1) continue;

    let rings = ringCache.get(country);
    if (!rings) {
      rings = parseRings(country.d);
      ringCache.set(country, rings);
    }
    for (const ring of rings) {
      if (pointInRing(point, ring)) return country.id;
    }
  }
  return null;
}

/** How far from a visited country the pointer can be and still pick it, in image units (about 2.8 per degree). */
const DEFAULT_TOLERANCE = 9;

/**
 * The visited country the pointer is on, or null. A direct hit wins; otherwise
 * the nearest visited country within `tolerance` counts, so tiny countries like
 * Taiwan are still easy to click.
 */
export function pickVisited(
  point: TexturePoint,
  countries: readonly PickableCountry[],
  visitedIds: ReadonlySet<string>,
  tolerance = DEFAULT_TOLERANCE
): string | null {
  let nearest: string | null = null;
  let nearestDistance = tolerance;

  for (const country of countries) {
    if (!visitedIds.has(country.id)) continue;

    const [x0, y0, x1, y1] = country.bbox;
    const inside =
      point.x >= x0 - tolerance &&
      point.x <= x1 + tolerance &&
      point.y >= y0 - tolerance &&
      point.y <= y1 + tolerance;
    if (!inside) continue;

    if (countryAt(point, [country]) === country.id) return country.id;

    const distance = Math.hypot(point.x - country.centroid[0], point.y - country.centroid[1]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = country.id;
    }
  }

  return nearest;
}

/** Globe rotation, applied in three's default XYZ order. */
export interface GlobeRotation {
  yaw: number;
  pitch: number;
}

/** The point on a unit sphere for an image position (the reverse of `sphereUv` + `uvToTexture`). */
export function texturePointOnSphere(
  point: TexturePoint,
  viewBox: readonly [number, number, number, number]
): { x: number; y: number; z: number } {
  const [x0, y0, width, height] = viewBox;
  const u = (point.x - x0) / width;
  const v = 1 - (point.y - y0) / height;
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  return {
    x: -Math.cos(phi) * Math.sin(theta),
    y: Math.cos(theta),
    z: Math.sin(phi) * Math.sin(theta),
  };
}

/**
 * The rotation that turns a point on the globe to face the camera. Yaw swings
 * it round to the front, then pitch tilts it by its latitude. Only correct for
 * the XYZ rotation order.
 */
export function facingRotation(point: { x: number; y: number; z: number }): GlobeRotation {
  return {
    yaw: Math.atan2(-point.x, point.z),
    pitch: Math.atan2(point.y, Math.hypot(point.x, point.z)),
  };
}
