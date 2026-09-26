import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import type { WorldMapCountry } from '@/types/gallery';

/**
 * The globe's surface, drawn on two canvases. The base (ocean, land, visited
 * countries) is drawn once. The texture copies the base and adds the hovered
 * country, so a hover change is one image copy plus one path.
 */

/** Colours. Ocean, land and ice are only used until the satellite image loads. */
const OCEAN_DEEP = '#1d3647';
const OCEAN_SHALLOW = '#2a4d61';
const LAND = '#a09274';
const LAND_EDGE = '#85795e';
const ICE = '#e8e6e0';
const VISITED = '#6fd1c4';
const VISITED_EDGE = '#ffffff';
const ACTIVE = '#dcebe9';
const ACTIVE_EDGE = '#2a5854';
const MARKER = '#2a5854';

/** Land nearer the poles than this is drawn as ice. */
const ICE_LATITUDE = 0.82;

/** Texture width in pixels; the height follows from the 2:1 image. */
const TEXTURE_WIDTH = 2048;

export interface GlobeTextureOptions {
  countries: readonly WorldMapCountry[];
  visitedIds: ReadonlySet<string>;
  viewBox: readonly [number, number, number, number];
  /** Satellite image of the earth, drawn under the borders. Without it, flat colours are used. */
  imagery?: CanvasImageSource | null;
}

export interface GlobeTexture {
  texture: CanvasTexture;
  /** Repaints for a new hovered country. No-op if nothing changed. */
  setHovered(id: string | null): void;
  dispose(): void;
}

/** A dot on a visited country, so even tiny ones are visible. */
function drawMarker(ctx: CanvasRenderingContext2D, centroid: readonly [number, number]) {
  const [cx, cy] = centroid;
  ctx.save();
  // White halo and ring, so the dot stands out on the photo.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = MARKER;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createGlobeTexture({
  countries,
  visitedIds,
  viewBox,
  imagery = null,
}: GlobeTextureOptions): GlobeTexture | null {
  if (typeof document === 'undefined') return null;

  const [x0, y0, width, height] = viewBox;
  const canvasWidth = TEXTURE_WIDTH;
  const canvasHeight = Math.round((TEXTURE_WIDTH * height) / width);
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

  const shapes = countries.map((country) => ({ country, path: new Path2D(country.d) }));
  const fit = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  };

  // Ocean: darker at the poles, lighter at the equator.
  const sea = base.createLinearGradient(0, 0, 0, canvasHeight);
  sea.addColorStop(0, OCEAN_DEEP);
  sea.addColorStop(0.5, OCEAN_SHALLOW);
  sea.addColorStop(1, OCEAN_DEEP);
  base.fillStyle = sea;
  base.fillRect(0, 0, canvasWidth, canvasHeight);

  fit(base);
  base.lineJoin = 'round';
  base.lineWidth = 0.5;
  base.fillStyle = LAND;
  base.strokeStyle = LAND_EDGE;

  const land = new Path2D();
  for (const { country, path } of shapes) {
    if (visitedIds.has(country.id)) continue;
    base.fill(path);
    base.stroke(path);
    land.addPath(path);
  }

  if (imagery) {
    // The photo uses the same projection, so it covers the whole canvas.
    base.save();
    base.setTransform(1, 0, 0, 1, 0, 0);
    base.drawImage(imagery, 0, 0, canvasWidth, canvasHeight);
    base.restore();

    // Faint borders over the photo.
    base.save();
    base.globalAlpha = 0.35;
    base.strokeStyle = LAND_EDGE;
    base.stroke(land);
    base.restore();
  }

  // Polar ice, only on land and fading out towards the equator. Clipping to
  // land stops it becoming a solid white disc at each pole. The photo has its
  // own ice, so this only runs without it.
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
  if (!imagery) {
    cap(y0, y0 + capHeight);
    cap(y0 + height, y0 + height - capHeight);
  }

  // Visited countries last, so they are on top.
  base.lineWidth = 1.2;
  base.fillStyle = VISITED;
  base.strokeStyle = VISITED_EDGE;
  for (const { country, path } of shapes) {
    if (!visitedIds.has(country.id)) continue;
    base.fill(path);
    base.stroke(path);
    drawMarker(base, country.centroid);
  }

  const texture = new CanvasTexture(faceEl);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;

  let hovered: string | null = null;

  const repaint = (id: string | null) => {
    face.setTransform(1, 0, 0, 1, 0, 0);
    face.clearRect(0, 0, canvasWidth, canvasHeight);
    face.drawImage(baseEl, 0, 0);

    const shape = id ? shapes.find((s) => s.country.id === id) : undefined;
    if (shape) {
      fit(face);
      face.fillStyle = ACTIVE;
      face.strokeStyle = ACTIVE_EDGE;
      face.lineJoin = 'round';
      face.lineWidth = 1.2;
      face.fill(shape.path);
      face.stroke(shape.path);
      drawMarker(face, shape.country.centroid);
    }
    texture.needsUpdate = true;
  };

  repaint(null);

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
