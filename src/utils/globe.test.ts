import { describe, expect, test } from 'bun:test';
import equirectJson from '../data/world-equirect.json';
import type { WorldMapSnapshot } from '../../scripts/lib/worldMap';
import { Euler, Matrix4, Vector3 } from 'three';
import {
  countryAt,
  facingRotation,
  facingUpRotation,
  parseRings,
  pickVisited,
  sphereUv,
  texturePointOnSphere,
  uvToTexture,
  type TexturePoint,
} from './globe';

const GLOBE = equirectJson as unknown as WorldMapSnapshot;

/**
 * A point on three's SphereGeometry for a given uv, straight from the
 * parameterisation in its source - so `sphereUv` is tested against the
 * geometry it actually has to invert, not against my own restatement of it.
 */
function spherePoint(u: number, v: number, radius = 1) {
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  return {
    x: -radius * Math.cos(phi) * Math.sin(theta),
    y: radius * Math.cos(theta),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

describe('parseRings', () => {
  test('reads a single closed ring', () => {
    expect(parseRings('M0,0L10,0L10,10Z')).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    ]);
  });

  test('splits a multi-part path into one ring per part', () => {
    const rings = parseRings('M0,0L4,0L4,4ZM10,10L14,10L14,14Z');
    expect(rings).toHaveLength(2);
    expect(rings[1][0]).toEqual({ x: 10, y: 10 });
  });

  test('handles negative and fractional coordinates', () => {
    expect(parseRings('M-1.5,2.25L3,-4L0,0Z')[0][0]).toEqual({ x: -1.5, y: 2.25 });
  });

  test('drops parts too short to be a polygon', () => {
    expect(parseRings('M0,0L1,1Z')).toEqual([]);
  });

  test('returns nothing for an empty path', () => {
    expect(parseRings('')).toEqual([]);
  });
});

describe('sphereUv', () => {
  test('round-trips the uv of a point on the sphere', () => {
    for (const u of [0, 0.25, 0.5, 0.75, 0.999]) {
      for (const v of [0.05, 0.3, 0.5, 0.8, 0.95]) {
        const [ru, rv] = sphereUv(spherePoint(u, v), 1);
        expect(ru).toBeCloseTo(u, 5);
        expect(rv).toBeCloseTo(v, 5);
      }
    }
  });

  test('is radius-independent', () => {
    const [u, v] = sphereUv(spherePoint(0.6, 0.4, 7), 7);
    expect(u).toBeCloseTo(0.6, 5);
    expect(v).toBeCloseTo(0.4, 5);
  });

  test('puts the poles at the top and bottom of the image', () => {
    expect(sphereUv({ x: 0, y: 1, z: 0 }, 1)[1]).toBeCloseTo(1, 5);
    expect(sphereUv({ x: 0, y: -1, z: 0 }, 1)[1]).toBeCloseTo(0, 5);
  });

  test('never returns a u outside [0, 1)', () => {
    for (const u of [0, 0.5, 0.9999]) {
      const got = sphereUv(spherePoint(u, 0.5), 1)[0];
      expect(got).toBeGreaterThanOrEqual(0);
      expect(got).toBeLessThan(1);
    }
  });
});

describe('uvToTexture', () => {
  const viewBox: [number, number, number, number] = [0, 0, 1024, 512];

  test('maps the top-left of the image to uv (0, 1)', () => {
    expect(uvToTexture(0, 1, viewBox)).toEqual({ x: 0, y: 0 });
  });

  test('maps the bottom-right of the image to uv (1, 0)', () => {
    expect(uvToTexture(1, 0, viewBox)).toEqual({ x: 1024, y: 512 });
  });

  test('puts uv (0.5, 0.5) at the centre', () => {
    expect(uvToTexture(0.5, 0.5, viewBox)).toEqual({ x: 512, y: 256 });
  });
});

describe('countryAt', () => {
  const countries = [
    { id: 'a', d: 'M0,0L10,0L10,10L0,10Z', bbox: [0, 0, 10, 10] },
    { id: 'b', d: 'M20,20L30,20L30,30L20,30Z', bbox: [20, 20, 30, 30] },
  ].map((c) => ({ ...c, bbox: c.bbox as [number, number, number, number] }));

  const at = (x: number, y: number) => countryAt({ x, y } as TexturePoint, countries);

  test('finds the country under the point', () => {
    expect(at(5, 5)).toBe('a');
    expect(at(25, 25)).toBe('b');
  });

  test('returns null out at sea', () => {
    expect(at(15, 15)).toBeNull();
    expect(at(-5, 5)).toBeNull();
  });

  test('resolves Taiwan from its own centroid in the real snapshot', () => {
    const taiwan = GLOBE.countries.find((c) => c.id === '158')!;
    const [cx, cy] = taiwan.centroid;
    expect(countryAt({ x: cx, y: cy } as TexturePoint, GLOBE.countries)).toBe('158');
  });

  test('resolves a few large countries from their centroids', () => {
    for (const id of ['643', '076', '356', '840']) {
      const country = GLOBE.countries.find((c) => c.id === id);
      if (!country) continue;
      const [cx, cy] = country.centroid;
      expect(countryAt({ x: cx, y: cy } as TexturePoint, GLOBE.countries)).toBe(id);
    }
  });

  test('finds nothing in the middle of the Pacific', () => {
    // Well west of South America, well east of Australia, on the equator.
    expect(countryAt({ x: 100, y: 256 } as TexturePoint, GLOBE.countries)).toBeNull();
  });
});

describe('pickVisited', () => {
  const visited = new Set(['158']);
  const at = (x: number, y: number, tolerance?: number) =>
    pickVisited({ x, y } as TexturePoint, GLOBE.countries, visited, tolerance);

  test('hits Taiwan dead on', () => {
    const [cx, cy] = GLOBE.countries.find((c) => c.id === '158')!.centroid;
    expect(at(cx, cy)).toBe('158');
  });

  test('still hits Taiwan from a near miss, which is the whole point', () => {
    // Taiwan is under a degree wide - about two screen pixels on the globe -
    // so an exact polygon test alone would make it unclickable.
    const [cx, cy] = GLOBE.countries.find((c) => c.id === '158')!.centroid;
    expect(at(cx + 5, cy + 4)).toBe('158');
  });

  test('gives up once the miss is bigger than the tolerance', () => {
    const [cx, cy] = GLOBE.countries.find((c) => c.id === '158')!.centroid;
    expect(at(cx + 40, cy, 8)).toBeNull();
  });

  test('never returns a country that has not been visited', () => {
    // Dead centre of mainland China, which borders the tolerance around Taiwan.
    const china = GLOBE.countries.find((c) => c.id === '156');
    if (!china) return;
    const [cx, cy] = china.centroid;
    expect(at(cx, cy)).toBeNull();
  });

  test('returns null in open water', () => {
    expect(at(100, 256)).toBeNull();
  });

  test('prefers an exact hit over a nearby centroid', () => {
    const both = new Set(['158', '156']);
    const china = GLOBE.countries.find((c) => c.id === '156');
    if (!china) return;
    const [cx, cy] = china.centroid;
    expect(pickVisited({ x: cx, y: cy } as TexturePoint, GLOBE.countries, both)).toBe('156');
  });
});

describe('facingRotation', () => {
  const viewBox = [0, 0, 1024, 512] as const;
  const atLonLat = (lon: number, lat: number) =>
    texturePointOnSphere(
      { x: ((lon + 180) / 360) * 1024, y: ((90 - lat) / 180) * 512 },
      viewBox
    );

  /** Where a point ends up once the mesh carries the returned rotation. */
  const rotated = (lon: number, lat: number) => {
    const p = atLonLat(lon, lat);
    const { yaw, pitch } = facingRotation(p);
    // three's default Euler order; the closed form depends on it.
    const m = new Matrix4().makeRotationFromEuler(new Euler(pitch, yaw, 0, 'XYZ'));
    return new Vector3(p.x, p.y, p.z).applyMatrix4(m);
  };

  test('brings every kind of place round to face the camera', () => {
    const places: [number, number][] = [
      [121, 23.7], // Taiwan
      [0, 0], // the degenerate point on the +X axis
      [-74, 40.7], // New York
      [151, -33.9], // Sydney
      [90, 40], // the globe's limb, which a Ry*Rx rig gets wrong
      [180, 0], // the date line, where longitude wraps
      [0, 80], // near the pole
    ];
    for (const [lon, lat] of places) {
      expect(rotated(lon, lat).distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-9);
    }
  });

  test('pitches by exactly the latitude', () => {
    for (const lat of [-60, -33.9, 0, 23.7, 40.7]) {
      for (const lon of [-180, -74, 0, 90, 121]) {
        expect(facingRotation(atLonLat(lon, lat)).pitch).toBeCloseTo((lat * Math.PI) / 180, 9);
      }
    }
  });

  test('round-trips through the texture: Taiwan is at 121E, 23.7N', () => {
    const taiwan = GLOBE.countries.find((c) => c.id === '158')!;
    const [cx, cy] = taiwan.centroid;
    const lon = (cx / 1024) * 360 - 180;
    const lat = 90 - (cy / 512) * 180;
    expect(lon).toBeCloseTo(121, 0);
    expect(lat).toBeCloseTo(23.7, 0);
  });
});

describe('facingUpRotation', () => {
  const viewBox = [0, 0, 1024, 512] as const;
  const atLonLat = (lon: number, lat: number) =>
    texturePointOnSphere(
      { x: ((lon + 180) / 360) * 1024, y: ((90 - lat) / 180) * 512 },
      viewBox
    );

  const rotated = (lon: number, lat: number) => {
    const p = atLonLat(lon, lat);
    const { yaw, pitch } = facingUpRotation(p);
    const m = new Matrix4().makeRotationFromEuler(new Euler(pitch, yaw, 0, 'XYZ'));
    return new Vector3(p.x, p.y, p.z).applyMatrix4(m);
  };

  test('stands every kind of place on top of the globe', () => {
    const places: [number, number][] = [
      [121, 23.7],
      [0, 0],
      [-74, 40.7],
      [151, -33.9],
      [90, 40],
      [180, 0],
      [0, 80],
      [0, -90],
    ];
    for (const [lon, lat] of places) {
      expect(rotated(lon, lat).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
    }
  });

  test('is a quarter turn of pitch away from facing the camera', () => {
    const p = atLonLat(121, 23.7);
    expect(facingUpRotation(p).pitch).toBeCloseTo(facingRotation(p).pitch - Math.PI / 2, 12);
    expect(facingUpRotation(p).yaw).toBeCloseTo(facingRotation(p).yaw, 12);
  });
});
