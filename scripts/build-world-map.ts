/**
 * Builds the world map JSON files from world-atlas. Run it by hand when the
 * visited countries change; the output is committed. Visited countries also
 * get a sharper outline, because they are shown large.
 */
import topology from 'world-atlas/countries-110m.json';
import detailTopology from 'world-atlas/countries-50m.json';
import type { Topology } from 'topojson-specification';
import { buildWorldMap } from './lib/worldMap';
import { GALLERY } from '../src/data/gallery';

const OUT = new URL('../src/data/world-map.json', import.meta.url);
const GLOBE_OUT = new URL('../src/data/world-equirect.json', import.meta.url);

/** Width of the globe's map in texture units; height is half of it. */
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

// The same outlines in the globe's projection, in a separate file that only the globe loads.
const globe = buildWorldMap(topology as unknown as Topology, {
  projection: 'equirectangular',
  width: GLOBE_WIDTH,
});
await Bun.write(GLOBE_OUT, JSON.stringify(globe));
console.log(`Wrote ${globe.countries.length} countries to ${GLOBE_OUT.pathname}`);
