import { describe, expect, test } from 'bun:test';
import type { GalleryManifest } from '../types/gallery';
import { findCountry, formatVisitedAt, zoomViewBoxFor } from './gallery';

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
