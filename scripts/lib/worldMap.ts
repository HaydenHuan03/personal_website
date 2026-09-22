import { geoNaturalEarth1, geoPath } from 'd3-geo';
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

export interface BuildWorldMapOptions {
  width?: number;
  height?: number;
  /** Higher-resolution topology (e.g. countries-50m) for `detailIds`. */
  detailTopology?: Topology;
  detailIds?: readonly string[];
}

/** Projects a world-atlas topology into SVG path data for a fixed viewBox. */
export function buildWorldMap(
  topology: Topology,
  { width = 960, height = 500, detailTopology, detailIds = [] }: BuildWorldMapOptions = {}
): WorldMapSnapshot {
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection
  ) as unknown as FeatureCollection<Geometry, { name: string }>;

  const projection = geoNaturalEarth1().fitSize([width, height], collection);
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

  return { viewBox: [0, 0, width, height], countries };
}
