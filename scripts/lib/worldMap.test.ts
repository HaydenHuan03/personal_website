import { describe, expect, test } from 'bun:test';
import topology from 'world-atlas/countries-110m.json';
import type { Topology } from 'topojson-specification';
import { buildWorldMap } from './worldMap';

const snapshot = buildWorldMap(topology as unknown as Topology);

describe('buildWorldMap', () => {
  test('uses a 960x500 viewBox by default', () => {
    expect(snapshot.viewBox).toEqual([0, 0, 960, 500]);
  });

  test('includes Taiwan (158) with a non-empty path', () => {
    const tw = snapshot.countries.find((c) => c.id === '158');
    expect(tw).toBeDefined();
    expect(tw!.name).toBe('Taiwan');
    expect(tw!.d.length).toBeGreaterThan(10);
  });

  test('every centroid and bbox lies inside the viewBox', () => {
    for (const c of snapshot.countries) {
      const [cx, cy] = c.centroid;
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThanOrEqual(960);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(500);
      const [x0, y0, x1, y1] = c.bbox;
      expect(x0).toBeLessThanOrEqual(x1);
      expect(y0).toBeLessThanOrEqual(y1);
    }
  });

  test('skips features without an id', () => {
    expect(snapshot.countries.every((c) => c.id !== '' && c.id !== 'undefined')).toBe(true);
  });
});
