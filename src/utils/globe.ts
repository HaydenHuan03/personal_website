import { pointInRing, type Point } from './landAnchor';

/**
 * Turning a point on the globe back into a country.
 *
 * The globe is one textured sphere, so there is no per-country mesh to
 * raycast. Instead the ray's hit point becomes a uv, the uv becomes a pixel in
 * the equirectangular image, and that pixel is tested against the same
 * outlines the image was painted from. That keeps picking exact at any zoom:
 * Taiwan is under a degree of longitude wide, about five pixels in a 1024-wide
 * texture, so reading a colour out of an id buffer would make it practically
 * unclickable, while a polygon test does not care how small it is drawn.
 */

/** A pixel in the equirectangular image's own coordinates. */
export type TexturePoint = Point;

/** The least a country needs for a point to be tested against it. */
interface CountryOutline {
  id: string;
  d: string;
  bbox: [number, number, number, number];
}

/** ...plus the centroid, for the forgiving pick below. */
interface PickableCountry extends CountryOutline {
  centroid: [number, number];
}

type Ring = Point[];

const ringCache = new WeakMap<CountryOutline, Ring[]>();

/**
 * Splits `d3-geo`'s path data into rings. Its output for a projected polygon
 * is only ever M, L and Z - no curves - so a split is enough and no general
 * SVG path parser is needed.
 */
export function parseRings(d: string): Ring[] {
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
    // Two points are a line, not an area.
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The uv of a point on a sphere, inverting three's `SphereGeometry`
 * parameterisation: v runs 0 at the south pole to 1 at the north, and u runs
 * eastward from the seam.
 */
export function sphereUv(point: Vec3, radius: number): [number, number] {
  const theta = Math.acos(Math.min(1, Math.max(-1, point.y / radius)));
  const v = 1 - theta / Math.PI;
  // atan2(z, -x) matches the sign convention of that parameterisation.
  let u = Math.atan2(point.z, -point.x) / (Math.PI * 2);
  if (u < 0) u += 1;
  if (u >= 1) u -= 1;
  return [u, v];
}

/** The pixel a uv lands on. Texture v runs up, image y runs down. */
export function uvToTexture(
  u: number,
  v: number,
  viewBox: readonly [number, number, number, number]
): TexturePoint {
  const [x0, y0, width, height] = viewBox;
  return { x: x0 + u * width, y: y0 + (1 - v) * height };
}

/**
 * The id of the country covering `point`, or null for open water. The bounding
 * boxes come from the snapshot, so all but a handful of countries are ruled
 * out before any polygon is walked.
 */
export function countryAt(
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

/**
 * How far off a visited country a pointer may be and still select it, in
 * texture units (1024 across the globe, so roughly 2.8 per degree).
 */
const DEFAULT_TOLERANCE = 9;

/**
 * The visited country a pointer is choosing, or null.
 *
 * Only visited countries can be picked at all - the rest of the world is
 * scenery - and they are picked forgivingly. An exact polygon hit wins, but
 * failing that the nearest visited centroid within `tolerance` counts, because
 * a country's size on screen has nothing to do with how easy it should be to
 * click: Taiwan is under a degree of longitude wide, which is under two pixels
 * on a globe filling a laptop screen. Without this, the one country in the
 * gallery would be effectively unclickable.
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

    // An exact hit beats any near miss, however close.
    if (countryAt(point, [country]) === country.id) return country.id;

    const distance = Math.hypot(point.x - country.centroid[0], point.y - country.centroid[1]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = country.id;
    }
  }

  return nearest;
}

/** A yaw/pitch pair for a globe mesh using three's default XYZ Euler order. */
export interface GlobeRotation {
  yaw: number;
  pitch: number;
}

/**
 * The local-space point on a unit sphere for a texture-space position, i.e.
 * the inverse of `uvToTexture` composed with `sphereUv`.
 */
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
 * The rotation that brings a point on the globe round to face the camera.
 *
 * With three's default XYZ Euler order the mesh's matrix is `Rx * Ry`: the yaw
 * is applied to the point first and the pitch second. That is the natural
 * globe rig, and it makes the solution exact and closed-form - the yaw swings
 * the point into the plane facing the camera, and the pitch is then simply its
 * latitude. Composing them the other way round (`Ry * Rx`, Euler YXZ) forces a
 * wild tilt for any point near the globe's left or right limb, because the
 * pitch would then have to flatten the point out of the plane by itself.
 */
export function facingRotation(point: { x: number; y: number; z: number }): GlobeRotation {
  return {
    yaw: Math.atan2(-point.x, point.z),
    pitch: Math.atan2(point.y, Math.hypot(point.x, point.z)),
  };
}

/**
 * The rotation that brings a point on the globe to the **top** of it.
 *
 * This is what the zoomed-in view needs. `facingRotation` turns a country
 * towards the camera, which puts its surface normal along +Z - pointing
 * straight at the viewer - so a landmark standing on that normal would be seen
 * end-on, down its own length. Bringing the country to +Y instead stands the
 * landmark up the screen, with the curve of the earth reading as ground
 * beneath it.
 *
 * Same yaw as `facingRotation`; the pitch is a quarter turn further, which is
 * exactly the difference between pointing a place at the camera and standing
 * it on top.
 */
export function facingUpRotation(point: { x: number; y: number; z: number }): GlobeRotation {
  const { yaw, pitch } = facingRotation(point);
  return { yaw, pitch: pitch - Math.PI / 2 };
}
