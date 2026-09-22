/**
 * Generates src/data/world-map.json from world-atlas (Natural Earth).
 * Run manually when changing projection/size or the visited-country list; the
 * output is committed so the client never bundles d3-geo or topojson.
 *
 * Visited countries additionally get a 50m outline, because they are shown
 * enlarged on their own, where the 110m world-scale outline looks like a blob.
 */
import topology from 'world-atlas/countries-110m.json';
import detailTopology from 'world-atlas/countries-50m.json';
import type { Topology } from 'topojson-specification';
import { buildWorldMap } from './lib/worldMap';
import { GALLERY } from '../src/data/gallery';

const OUT = new URL('../src/data/world-map.json', import.meta.url);
const detailIds = GALLERY.countries.map((c) => c.id);
const snapshot = buildWorldMap(topology as unknown as Topology, {
  detailTopology: detailTopology as unknown as Topology,
  detailIds,
});
await Bun.write(OUT, JSON.stringify(snapshot));
console.log(
  `Wrote ${snapshot.countries.length} countries (detail: ${detailIds.join(', ') || 'none'}) to ${OUT.pathname}`
);
