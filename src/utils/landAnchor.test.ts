import { describe, expect, test } from 'bun:test';
import {
  landAnchor,
  largestRing,
  pointInRing,
  poleOfInaccessibility,
  ringArea,
  ringCentroid,
  signedDistance,
  type Point,
} from './landAnchor';

const square = (cx: number, cy: number, half: number): Point[] => [
  { x: cx - half, y: cy - half },
  { x: cx + half, y: cy - half },
  { x: cx + half, y: cy + half },
  { x: cx - half, y: cy + half },
];

describe('ringArea', () => {
  test('measures a square regardless of winding', () => {
    const ring = square(0, 0, 5);
    expect(Math.abs(ringArea(ring))).toBeCloseTo(100, 6);
    expect(Math.abs(ringArea([...ring].reverse()))).toBeCloseTo(100, 6);
  });
});

describe('pointInRing', () => {
  test('separates inside from outside', () => {
    const ring = square(0, 0, 5);
    expect(pointInRing({ x: 0, y: 0 }, ring)).toBe(true);
    expect(pointInRing({ x: 9, y: 0 }, ring)).toBe(false);
  });
});

describe('signedDistance', () => {
  test('is the distance to the nearest edge, negated outside', () => {
    const ring = square(0, 0, 5);
    expect(signedDistance({ x: 0, y: 0 }, ring)).toBeCloseTo(5, 6);
    expect(signedDistance({ x: 8, y: 0 }, ring)).toBeCloseTo(-3, 6);
  });
});

describe('largestRing', () => {
  test('picks the mainland over outlying islands', () => {
    const mainland = square(0, 0, 10);
    const island = square(80, 0, 1);
    expect(largestRing([island, mainland])).toBe(mainland);
  });

  test('ignores degenerate rings and returns null when there are none', () => {
    expect(largestRing([[{ x: 0, y: 0 }]])).toBeNull();
    expect(largestRing([])).toBeNull();
  });
});

describe('poleOfInaccessibility', () => {
  test('finds the centre of a square', () => {
    const anchor = poleOfInaccessibility(square(3, -4, 6));
    expect(anchor.x).toBeCloseTo(3, 1);
    expect(anchor.y).toBeCloseTo(-4, 1);
  });

  test('stays inside a C shape, whose centroid falls outside it', () => {
    // A ring open to the right; its centroid sits in the gap, not on land.
    const c: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 8 },
      { x: 10, y: 8 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInRing(ringCentroid(c), c)).toBe(false);
    const anchor = poleOfInaccessibility(c);
    expect(pointInRing(anchor, c)).toBe(true);
    // And it should be deep inside the spine, not hugging an edge.
    expect(signedDistance(anchor, c)).toBeGreaterThan(1);
  });
});

describe('landAnchor', () => {
  test('anchors on the mainland, not between it and a distant island', () => {
    const mainland = square(0, 0, 10);
    const island = square(200, 0, 2);
    const anchor = landAnchor([mainland, island]);
    expect(anchor).not.toBeNull();
    expect(pointInRing(anchor!, mainland)).toBe(true);
    expect(Math.abs(anchor!.x)).toBeLessThan(1);
  });

  test('returns null without a usable ring', () => {
    expect(landAnchor([])).toBeNull();
  });
});
