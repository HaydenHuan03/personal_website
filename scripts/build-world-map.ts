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
const GLOBE_OUT = new URL('../src/data/world-equirect.json', import.meta.url);

/** Texture-space width of the globe snapshot; the height follows as width/2. */
const GLOBE_WIDTH = 1024;
const detailIds = GALLERY.countries.map((c) => c.id);
const snapshot = buildWorldMap(topology as unknown as Topology, {
  detailTopology: detailTopology as unknown as Topology,
  detailIds,
});
await Bun.write(OUT, JSON.stringify(snapshot));
console.log(
  `Wrote ${snapshot.countries.length} countries (detail: ${detailIds.join(', ') || 'none'}) to ${OUT.pathname}`
);

// The same outlines in plate carree, for the globe. Kept in its own file
// because only the globe's chunk needs it - the server-rendered flat map must
// not pay to download a projection it never draws. No detail outlines here:
// the globe never enlarges a single country, CountryStage does.
const globe = buildWorldMap(topology as unknown as Topology, {
  projection: 'equirectangular',
  width: GLOBE_WIDTH,
});
await Bun.write(GLOBE_OUT, JSON.stringify(globe));
console.log(`Wrote ${globe.countries.length} countries to ${GLOBE_OUT.pathname}`);
