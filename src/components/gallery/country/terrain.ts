import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/** Textures for the country slab, drawn on a canvas from the country's outline. Nothing is downloaded. */

/** Seeded random numbers, so a country always gets the same terrain. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function canvas(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = Math.max(1, Math.round(width));
  el.height = Math.max(1, Math.round(height));
  return el;
}

/** Longest edge of the generated land texture, in pixels. */
const LAND_RESOLUTION = 1024;

interface LandOptions {
  /** The outline as SVG path data. */
  d: string;
  /** Bounds of that outline: [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number];
}

/**
 * The top face: coast, lowland and interior. A blurred copy of the outline
 * works out how far inland each pixel is, so greens darken inland and sand
 * only appears along the coast.
 */
export function createLandTexture({ d, bounds }: LandOptions): Texture | null {
  if (typeof document === 'undefined') return null;
  const [x0, y0, x1, y1] = bounds;
  const spanX = Math.max(x1 - x0, 1e-6);
  const spanY = Math.max(y1 - y0, 1e-6);
  const scale = LAND_RESOLUTION / Math.max(spanX, spanY);
  const width = Math.max(64, Math.round(spanX * scale));
  const height = Math.max(64, Math.round(spanY * scale));
  const shortest = Math.min(width, height);

  // Maps outline coordinates onto the canvas; the slab's UVs use the same bounds.
  const fit = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(width / spanX, 0, 0, height / spanY, (-x0 * width) / spanX, (-y0 * height) / spanY);
  };
  const path = new Path2D(d);

  // Inland mask: solid far inland, fading to clear at the coast.
  const maskEl = canvas(width, height);
  const mask = maskEl.getContext('2d');
  if (!mask) return null;
  mask.filter = `blur(${Math.max(2, shortest * 0.06)}px)`;
  mask.fillStyle = '#fff';
  fit(mask);
  mask.fill(path);

  const el = canvas(width, height);
  const ctx = el.getContext('2d');
  if (!ctx) return null;

  // Lowland base.
  ctx.fillStyle = '#6ea36d';
  ctx.fillRect(0, 0, width, height);

  // Random blobs of colour: large patches, then small specks.
  const rand = mulberry32(seedFrom(d));
  const blob = (count: number, radius: number, colors: string[], alpha: number) => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < count; i++) {
      const cx = rand() * width;
      const cy = rand() * height;
      const r = radius * (0.5 + rand());
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const color = colors[Math.floor(rand() * colors.length)];
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  blob(90, shortest * 0.22, ['#7fb073', '#5f9263', '#87b47c'], 0.5);
  blob(320, shortest * 0.05, ['#4f7f56', '#3f6b4a', '#6fa268'], 0.35);

  // Inland layers through the mask: highland green, then a bare ridge in the middle.
  const layer = (color: string, maskAlpha: number, blurPx: number) => {
    const tintEl = canvas(width, height);
    const tint = tintEl.getContext('2d');
    if (!tint) return;
    tint.fillStyle = color;
    tint.fillRect(0, 0, width, height);
    tint.globalCompositeOperation = 'destination-in';
    if (blurPx) tint.filter = `blur(${blurPx}px)`;
    tint.drawImage(maskEl, 0, 0);
    ctx.globalAlpha = maskAlpha;
    ctx.drawImage(tintEl, 0, 0);
    ctx.globalAlpha = 1;
  };
  layer('#3d6b4d', 0.75, 0);
  layer('#8c8a6a', 0.35, Math.max(1, shortest * 0.02));

  // Coast: a soft sand line along the outline.
  ctx.save();
  fit(ctx);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#d9cfa8';
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = (shortest * 0.018) / (height / spanY);
  ctx.stroke(path);
  ctx.strokeStyle = '#b9a87c';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = (shortest * 0.006) / (height / spanY);
  ctx.stroke(path);
  ctx.restore();

  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
}

/** The side walls: topsoil over subsoil over bedrock, with rock layers. */
export function createCliffTexture(): Texture | null {
  if (typeof document === 'undefined') return null;
  const width = 128;
  const height = 256;
  const el = canvas(width, height);
  const ctx = el.getContext('2d');
  if (!ctx) return null;

  // Bedrock at the bottom of the image, topsoil at the top.
  const gradient = ctx.createLinearGradient(0, height, 0, 0);
  gradient.addColorStop(0, '#5c5347');
  gradient.addColorStop(0.55, '#6b5b46');
  gradient.addColorStop(0.86, '#7a6444');
  gradient.addColorStop(0.92, '#4a5c3c');
  gradient.addColorStop(1, '#3f6b4d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Rock layers: thin, slightly wavy horizontal bands.
  const rand = mulberry32(0x5eab17);
  for (let i = 0; i < 26; i++) {
    const y = rand() * height * 0.88;
    const thickness = 1 + rand() * 3;
    ctx.globalAlpha = 0.12 + rand() * 0.16;
    ctx.fillStyle = rand() > 0.5 ? '#3d352c' : '#8a795e';
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += width / 8) {
      ctx.lineTo(x, y + (rand() - 0.5) * 3);
    }
    ctx.lineTo(width, y + thickness);
    for (let x = width; x >= 0; x -= width / 8) {
      ctx.lineTo(x, y + thickness + (rand() - 0.5) * 3);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}
