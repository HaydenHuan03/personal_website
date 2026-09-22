import { geoEquirectangular, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

export interface WorldMapCountry {
  id: string;
  name: string;
  d: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  /**
   * Higher-resolution outline, emitted only for the ids passed in `detailIds`.
   * The low-resolution `d` is fine at world scale but turns into a blob when a
   * country is enlarged on its own, which is what visited countries do.
   */
  detailD?: string;
  /** Centroid/bbox of `detailD`, which differs from the coarse outline's. */
  detailCentroid?: [number, number];
  detailBbox?: [number, number, number, number];
}

export interface WorldMapSnapshot {
  viewBox: [number, number, number, number];
  countries: WorldMapCountry[];
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * How the sphere is flattened.
 *
 * `naturalEarth1` is the flat map on the page. `equirectangular` is for the
 * globe: longitude and latitude map linearly to x and y, which is exactly what
 * wrapping an image around a sphere expects, and makes the inverse - screen
 * point back to a country - a division rather than a projection solve.
 */
export type MapProjection = 'naturalEarth1' | 'equirectangular';

/**
 * The plate carree projection at a given image width, sized so the image spans
 * the whole globe: 360 degrees across, 180 down, hence a 2:1 image. Built by
 * hand rather than with `fitSize`, which would fit the *data's* bounds - land
 * stops short of +-180 degrees, so the texture would be subtly stretched and
 * every inverse lookup would be off.
 */
export function equirectangular(width: number): GeoProjection {
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
  // Equirectangular covers the whole sphere, so its height follows from its
  // width and the caller's is ignored.
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

  // Detail geometry is projected with the SAME projection, so the two
  // outlines share a coordinate space and can be swapped in place.
  const wanted = new Set(detailIds);
  const detailPaths = new Map<
    string,
    { d: string; centroid: [number, number]; bbox: [number, number, number, number] }
  >();
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
      const [[dx0, dy0], [dx1, dy1]] = path.bounds(f);
      detailPaths.set(id, {
        d,
        centroid: [round(dcx), round(dcy)],
        bbox: [round(dx0), round(dy0), round(dx1), round(dy1)],
      });
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
      ...(detail
        ? { detailD: detail.d, detailCentroid: detail.centroid, detailBbox: detail.bbox }
        : {}),
    });
  }

  return { viewBox: [0, 0, width, imageHeight], countries };
}
