import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import type { WorldMapCountry } from '../../../scripts/lib/worldMap';

/**
 * The globe's surface, painted from the same outlines the flat map draws.
 *
 * Two canvases rather than one. The base holds everything that never changes -
 * ocean, land, visited countries - and is painted once. The texture canvas is
 * that base blitted back, plus the one country under the pointer. Repainting a
 * hover is therefore a single image copy and a single filled path, and it only
 * happens when the hovered country *changes*, never per frame.
 */

/**
 * Palette. It reads as an earth - water, land, ice - without going
 * photographic, which would fight the page's warm stone background. The two
 * unvisited tones are deliberately low-contrast against the ocean: everywhere
 * you have not been is scenery, and it should not invite a click it will not
 * answer. Visited countries carry the site's accent and are the only thing on
 * the sphere with real colour.
 */
const OCEAN_DEEP = '#4a7f92';
const OCEAN_SHALLOW = '#6fa3b4';
const LAND = '#cabfa4';
const LAND_EDGE = '#b3a689';
const ICE = '#e8e6e0';
const VISITED = '#3f7d78';
const VISITED_EDGE = '#2a5854';
const ACTIVE = '#dcebe9';
const ACTIVE_EDGE = '#2a5854';
const MARKER = '#2a5854';

/** Latitudes poleward of this are drawn as ice rather than land. */
const ICE_LATITUDE = 0.82;

export interface GlobeTextureOptions {
  countries: readonly WorldMapCountry[];
  visitedIds: ReadonlySet<string>;
  viewBox: readonly [number, number, number, number];
  /** Texture width in pixels; the height follows from the 2:1 image. */
  resolution?: number;
}

export interface GlobeTexture {
  texture: CanvasTexture;
  /** Repaints for a new hovered country. No-op if nothing changed. */
  setHovered(id: string | null): void;
  dispose(): void;
}

/**
 * The dot over a visited country. Taiwan is about two pixels wide on a globe
 * filling a laptop screen, so without a marker a visited country can be
 * invisible - and picking is forgiving to match (see `pickVisited`).
 */
function drawMarker(ctx: CanvasRenderingContext2D, centroid: readonly [number, number]) {
  const [cx, cy] = centroid;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = MARKER;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paths(countries: readonly WorldMapCountry[]) {
  return new Map(countries.map((c) => [c.id, new Path2D(c.d)]));
}

export function createGlobeTexture({
  countries,
  visitedIds,
  viewBox,
  resolution = 2048,
}: GlobeTextureOptions): GlobeTexture | null {
  if (typeof document === 'undefined') return null;

  const [x0, y0, width, height] = viewBox;
  const canvasWidth = resolution;
  const canvasHeight = Math.round((resolution * height) / width);
  const scale = canvasWidth / width;

  const make = () => {
    const el = document.createElement('canvas');
    el.width = canvasWidth;
    el.height = canvasHeight;
    return el;
  };

  const baseEl = make();
  const faceEl = make();
  const base = baseEl.getContext('2d');
  const face = faceEl.getContext('2d');
  if (!base || !face) return null;

  const shapes = paths(countries);
  const fit = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  };

  // Ocean: darker towards the poles, lighter at the equator, which is roughly
  // how the sea reads from orbit and stops the water looking like flat paper.
  const sea = base.createLinearGradient(0, 0, 0, canvasHeight);
  sea.addColorStop(0, OCEAN_DEEP);
  sea.addColorStop(0.5, OCEAN_SHALLOW);
  sea.addColorStop(1, OCEAN_DEEP);
  base.fillStyle = sea;
  base.fillRect(0, 0, canvasWidth, canvasHeight);

  fit(base);
  base.lineJoin = 'round';
  base.lineWidth = 0.5;

  for (const country of countries) {
    const path = shapes.get(country.id);
    if (!path) continue;
    if (visitedIds.has(country.id)) continue;
    base.fillStyle = LAND;
    base.strokeStyle = LAND_EDGE;
    base.fill(path);
    base.stroke(path);
  }

  // Polar ice, clipped to land and faded towards the tropics.
  //
  // It must be clipped: in an equirectangular image the top row of pixels IS
  // the north pole, so a band filled across the full width collapses into a
  // solid white disc at each pole on the sphere. Only Antarctica, Greenland
  // and the northern rim should whiten, and the gradient keeps the boundary
  // from reading as a drawn line of latitude.
  const land = new Path2D();
  for (const country of countries) {
    const path = shapes.get(country.id);
    if (path && !visitedIds.has(country.id)) land.addPath(path);
  }
  const capHeight = ((1 - ICE_LATITUDE) / 2) * height;
  const cap = (top: number, fadeTowards: number) => {
    base.save();
    fit(base);
    base.clip(land);
    const fade = base.createLinearGradient(0, top, 0, fadeTowards);
    fade.addColorStop(0, ICE);
    fade.addColorStop(1, 'rgba(232, 230, 224, 0)');
    base.fillStyle = fade;
    base.fillRect(x0, Math.min(top, fadeTowards), width, capHeight);
    base.restore();
  };
  cap(y0, y0 + capHeight);
  cap(y0 + height, y0 + height - capHeight);

  // Visited countries last, so nothing overdraws them.
  base.lineWidth = 0.9;
  for (const country of countries) {
    const path = shapes.get(country.id);
    if (!path || !visitedIds.has(country.id)) continue;
    base.fillStyle = VISITED;
    base.strokeStyle = VISITED_EDGE;
    base.fill(path);
    base.stroke(path);
    drawMarker(base, country.centroid);
  }

  const texture = new CanvasTexture(faceEl);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;

  let hovered: string | null | undefined;

  const repaint = (id: string | null) => {
    face.setTransform(1, 0, 0, 1, 0, 0);
    face.clearRect(0, 0, canvasWidth, canvasHeight);
    face.drawImage(baseEl, 0, 0);

    const path = id ? shapes.get(id) : undefined;
    const country = id ? countries.find((c) => c.id === id) : undefined;
    if (path && country) {
      fit(face);
      face.fillStyle = ACTIVE;
      face.strokeStyle = ACTIVE_EDGE;
      face.lineJoin = 'round';
      face.lineWidth = 1.2;
      face.fill(path);
      face.stroke(path);
      drawMarker(face, country.centroid);
    }
    texture.needsUpdate = true;
  };

  repaint(null);
  hovered = null;

  return {
    texture,
    setHovered(id) {
      if (id === hovered) return;
      hovered = id;
      repaint(id);
    },
    dispose() {
      texture.dispose();
    },
  };
}
