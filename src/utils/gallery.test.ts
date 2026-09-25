import { describe, expect, test } from 'bun:test';
import type { GalleryManifest, GalleryPhoto } from '../types/gallery';
import {
  bubbleSpots,
  findCountry,
  formatVisitedAt,
  photoAlt,
  photoLayout,
  unionBbox,
  zoomViewBoxFor,
} from './gallery';

const manifest: GalleryManifest = {
  version: 1,
  countries: [
    {
      id: '158',
      name: 'Taiwan',
      visitedAt: '2025-03',
      landmark: {
        name: 'Taipei 101',
        model: '/gallery/twn/landmark.glb',
        attribution: { author: 'A', source: 'https://x', license: 'CC BY 3.0' },
      },
      photos: [],
    },
  ],
};

describe('findCountry', () => {
  test('returns the matching country', () => {
    expect(findCountry(manifest, '158')?.name).toBe('Taiwan');
  });
  test('returns undefined for unknown, null, or undefined ids', () => {
    expect(findCountry(manifest, '999')).toBeUndefined();
    expect(findCountry(manifest, null)).toBeUndefined();
    expect(findCountry(manifest, undefined)).toBeUndefined();
  });
});

describe('zoomViewBoxFor', () => {
  const base: [number, number, number, number] = [0, 0, 960, 500];

  test('keeps the base aspect ratio', () => {
    const [, , w, h] = zoomViewBoxFor([100, 100, 120, 130], base);
    expect(w / h).toBeCloseTo(960 / 500, 5);
  });

  test('contains the bbox with padding', () => {
    const [x, y, w, h] = zoomViewBoxFor([100, 100, 120, 130], base, 2);
    expect(x).toBeLessThan(100);
    expect(y).toBeLessThan(100);
    expect(x + w).toBeGreaterThan(120);
    expect(y + h).toBeGreaterThan(130);
  });

  test('never zooms wider than the base', () => {
    const [x, y, w, h] = zoomViewBoxFor([0, 0, 960, 500], base, 3);
    expect([x, y, w, h]).toEqual(base);
  });

  test('centers on the bbox', () => {
    const [x, y, w, h] = zoomViewBoxFor([100, 100, 120, 130], base);
    expect(x + w / 2).toBeCloseTo(110, 5);
    expect(y + h / 2).toBeCloseTo(115, 5);
  });
});

describe('formatVisitedAt', () => {
  test('formats YYYY-MM as Month YYYY', () => {
    expect(formatVisitedAt('2025-03')).toBe('March 2025');
  });
  test('returns the input unchanged when it is not YYYY-MM', () => {
    expect(formatVisitedAt('2025')).toBe('2025');
  });
});

describe('unionBbox', () => {
  test('returns null with nothing to union', () => {
    expect(unionBbox([])).toBeNull();
  });

  test('covers every box', () => {
    expect(unionBbox([
      [10, 20, 30, 40],
      [5, 25, 12, 60],
    ])).toEqual([5, 20, 30, 60]);
  });
});

const photo = (width: number, height: number, extra: Partial<GalleryPhoto> = {}): GalleryPhoto => ({
  id: `${width}x${height}`,
  src: '',
  thumb: '',
  width,
  height,
  caption: '',
  ...extra,
});
const landscape = photo(1600, 1067);
const portrait = photo(1067, 1600);
const square = photo(1200, 1200);

describe('photoLayout', () => {
  test('pairs a landscape with a portrait, the portrait stepped down', () => {
    expect(photoLayout([landscape, portrait])).toEqual([
      { row: 1, start: 1, span: 7, offset: false },
      { row: 1, start: 9, span: 4, offset: true },
    ]);
  });

  test('mirrors every other pair, keeping both photos on one row', () => {
    const layout = photoLayout([landscape, portrait, landscape, portrait]);
    expect(layout[2]).toEqual({ row: 2, start: 6, span: 7, offset: false });
    expect(layout[3]).toEqual({ row: 2, start: 1, span: 4, offset: true });
  });

  test('pairs two squares', () => {
    expect(photoLayout([square, square])).toEqual([
      { row: 1, start: 1, span: 5, offset: false },
      { row: 1, start: 8, span: 5, offset: true },
    ]);
  });

  test('gives a photo that cannot pair a wider row of its own, alternating sides', () => {
    expect(photoLayout([landscape, landscape, landscape])).toEqual([
      { row: 1, start: 4, span: 8, offset: false },
      { row: 2, start: 2, span: 8, offset: false },
      { row: 3, start: 4, span: 8, offset: false },
    ]);
  });

  test('returns nothing for no photos', () => {
    expect(photoLayout([])).toEqual([]);
  });
});

describe('photoAlt', () => {
  test('prefers the alt text, then the caption', () => {
    expect(photoAlt(photo(10, 10, { alt: 'Lanterns', caption: 'Jiufen' }), 'Taiwan', 0, 3)).toBe('Lanterns');
    expect(photoAlt(photo(10, 10, { caption: 'Jiufen' }), 'Taiwan', 0, 3)).toBe('Jiufen');
  });

  test('falls back to the country and position', () => {
    expect(photoAlt(photo(10, 10), 'Taiwan', 2, 12)).toBe('Taiwan, photo 3 of 12');
  });
});

describe('bubbleSpots', () => {
  test('gives one spot per photo', () => {
    expect(bubbleSpots(12)).toHaveLength(12);
    expect(bubbleSpots(0)).toEqual([]);
  });

  test('keeps the middle clear for the words', () => {
    for (const { x, y } of bubbleSpots(12)) {
      expect((x / 36) ** 2 + (y / 30) ** 2).toBeGreaterThanOrEqual(0.999);
    }
  });

  test('keeps every bubble centred on the screen', () => {
    for (const { x, y } of bubbleSpots(30)) {
      expect(Math.abs(x)).toBeLessThan(50);
      expect(Math.abs(y)).toBeLessThan(50);
    }
  });

  test('surrounds the words on all four sides', () => {
    const spots = bubbleSpots(8);
    expect(spots.some((s) => s.x < 0 && s.y < 0)).toBe(true);
    expect(spots.some((s) => s.x > 0 && s.y < 0)).toBe(true);
    expect(spots.some((s) => s.x < 0 && s.y > 0)).toBe(true);
    expect(spots.some((s) => s.x > 0 && s.y > 0)).toBe(true);
  });

  test('varies their sizes within a full size', () => {
    const sizes = bubbleSpots(12).map((s) => s.size);
    expect(new Set(sizes).size).toBeGreaterThan(2);
    for (const size of sizes) {
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(1);
    }
  });
});
