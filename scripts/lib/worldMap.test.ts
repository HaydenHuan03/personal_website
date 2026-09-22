import { describe, expect, test } from 'bun:test';
import topology from 'world-atlas/countries-110m.json';
import detail from 'world-atlas/countries-50m.json';
import type { Topology } from 'topojson-specification';
import { buildWorldMap, equirectangular } from './worldMap';

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

  test('omits detail outlines when none are requested', () => {
    expect(snapshot.countries.every((c) => c.detailD === undefined)).toBe(true);
  });
});

describe('buildWorldMap with detail geometry', () => {
  const detailed = buildWorldMap(topology as unknown as Topology, {
    detailTopology: detail as unknown as Topology,
    detailIds: ['158'],
  });

  test('emits a detail outline only for the requested ids', () => {
    const tw = detailed.countries.find((c) => c.id === '158');
    expect(tw?.detailD).toBeTruthy();
    expect(detailed.countries.filter((c) => c.detailD).length).toBe(1);
  });

  test('the detail outline is richer than the base outline', () => {
    const tw = detailed.countries.find((c) => c.id === '158')!;
    expect(tw.detailD!.length).toBeGreaterThan(tw.d.length);
  });

  test('the detail outline sits in the same projected space', () => {
    const tw = detailed.countries.find((c) => c.id === '158')!;
    const xs = [...tw.detailD!.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[1]));
    const [x0, , x1] = tw.bbox;
    // Generous tolerance: the finer topology also carries outlying islands the
    // 110m outline drops (Taiwan's Penghu and Kinmen sit ~5 units west of the
    // main island), so the detail outline legitimately overhangs the base bbox.
    for (const x of xs) {
      expect(x).toBeGreaterThan(x0 - 15);
      expect(x).toBeLessThan(x1 + 15);
    }
  });
});

describe('buildWorldMap in equirectangular mode', () => {
  const globe = buildWorldMap(topology as unknown as Topology, {
    projection: 'equirectangular',
    width: 1024,
  });

  test('covers the whole sphere in a 2:1 viewBox', () => {
    expect(globe.viewBox).toEqual([0, 0, 1024, 512]);
  });

  test('is a linear lon/lat mapping, so the prime meridian is the centre', () => {
    // Null Island projects to the exact middle of the image.
    const [x, y] = equirectangular(1024)([0, 0])!;
    expect(x).toBeCloseTo(512, 3);
    expect(y).toBeCloseTo(256, 3);
  });

  test('maps the date line to the edges and the poles to top and bottom', () => {
    const project = equirectangular(1024);
    expect(project([180, 0])![0]).toBeCloseTo(1024, 3);
    expect(project([-180, 0])![0]).toBeCloseTo(0, 3);
    expect(project([0, 90])![1]).toBeCloseTo(0, 3);
    expect(project([0, -90])![1]).toBeCloseTo(512, 3);
  });

  test('every country stays inside the image', () => {
    for (const c of globe.countries) {
      const [x0, y0, x1, y1] = c.bbox;
      expect(x0).toBeGreaterThanOrEqual(-0.05);
      expect(y0).toBeGreaterThanOrEqual(-0.05);
      expect(x1).toBeLessThanOrEqual(1024.05);
      expect(y1).toBeLessThanOrEqual(512.05);
    }
  });

  test('puts Taiwan in the northern hemisphere, east of the prime meridian', () => {
    const tw = globe.countries.find((c) => c.id === '158')!;
    const [cx, cy] = tw.centroid;
    expect(cx).toBeGreaterThan(512);
    expect(cy).toBeLessThan(256);
  });
});
