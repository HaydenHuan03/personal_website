import { geoEquirectangular, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { WorldMapCountry, WorldMapSnapshot } from '../../src/types/gallery';

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * How the world is flattened. `naturalEarth1` is for the flat map.
 * `equirectangular` is for the globe: longitude and latitude map straight to
 * x and y, which is what wrapping an image round a sphere needs.
 */
export type MapProjection = 'naturalEarth1' | 'equirectangular';

/**
 * An equirectangular projection covering the whole globe (360 by 180 degrees,
 * a 2:1 image). Set by hand because `fitSize` would fit the land, not the globe.
 */
function equirectangular(width: number): GeoProjection {
  return geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, width / 4]);
}

export interface BuildWorldMapOptions {
  width?: number;
  height?: number;
  /** Defaults to `naturalEarth1`. */
  projection?: MapProjection;
  /** Higher-resolution topology (e.g. countries-50m) for `detailIds`. */
  detailTopology?: Topology;
  detailIds?: readonly string[];
}

/** Projects a world-atlas topology into SVG path data for a fixed viewBox. */
export function buildWorldMap(
  topology: Topology,
  {
    width = 960,
    height = 500,
    projection: kind = 'naturalEarth1',
    detailTopology,
    detailIds = [],
  }: BuildWorldMapOptions = {}
): WorldMapSnapshot {
  // Equirectangular is always 2:1, so its height comes from the width.
  const imageHeight = kind === 'equirectangular' ? width / 2 : height;
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection
  ) as unknown as FeatureCollection<Geometry, { name: string }>;

  const projection =
    kind === 'equirectangular'
      ? equirectangular(width)
      : geoNaturalEarth1().fitSize([width, height], collection);
  const path = geoPath(projection);

  // Use the same projection for detail outlines, so they line up with the normal ones.
  const wanted = new Set(detailIds);
  const detailPaths = new Map<string, { d: string; centroid: [number, number] }>();
  if (detailTopology && wanted.size) {
    const detailCollection = feature(
      detailTopology,
      detailTopology.objects.countries as GeometryCollection
    ) as unknown as FeatureCollection<Geometry, { name: string }>;
    for (const f of detailCollection.features as Feature<Geometry, { name: string }>[]) {
      const id = f.id === undefined || f.id === null ? '' : String(f.id);
      if (!wanted.has(id)) continue;
      const d = path(f);
      if (!d) continue;
      const [dcx, dcy] = path.centroid(f);
      detailPaths.set(id, { d, centroid: [round(dcx), round(dcy)] });
    }
  }

  const countries: WorldMapCountry[] = [];
  for (const f of collection.features as Feature<Geometry, { name: string }>[]) {
    if (f.id === undefined || f.id === null) continue;
    const d = path(f);
    if (!d) continue;
    const [cx, cy] = path.centroid(f);
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const id = String(f.id);
    const detail = detailPaths.get(id);
    countries.push({
      id,
      name: f.properties?.name ?? id,
      d,
      centroid: [round(cx), round(cy)],
      bbox: [round(x0), round(y0), round(x1), round(y1)],
      ...(detail ? { detailD: detail.d, detailCentroid: detail.centroid } : {}),
    });
  }

  return { viewBox: [0, 0, width, imageHeight], countries };
}
