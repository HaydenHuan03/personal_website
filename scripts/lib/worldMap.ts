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
}

export interface WorldMapSnapshot {
  viewBox: [number, number, number, number];
  countries: WorldMapCountry[];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Projects a world-atlas topology into SVG path data for a fixed viewBox. */
export function buildWorldMap(topology: Topology, width = 960, height = 500): WorldMapSnapshot {
  const collection = feature(
    topology,
    topology.objects.countries as GeometryCollection
  ) as unknown as FeatureCollection<Geometry, { name: string }>;

  const projection = geoNaturalEarth1().fitSize([width, height], collection);
  const path = geoPath(projection);

  const countries: WorldMapCountry[] = [];
  for (const f of collection.features as Feature<Geometry, { name: string }>[]) {
    if (f.id === undefined || f.id === null) continue;
    const d = path(f);
    if (!d) continue;
    const [cx, cy] = path.centroid(f);
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    countries.push({
      id: String(f.id),
      name: f.properties?.name ?? String(f.id),
      d,
      centroid: [round(cx), round(cy)],
      bbox: [round(x0), round(y0), round(x1), round(y1)],
    });
  }

  return { viewBox: [0, 0, width, height], countries };
}
