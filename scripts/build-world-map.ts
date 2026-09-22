/**
 * Generates src/data/world-map.json from world-atlas (Natural Earth 110m).
 * Run manually when changing projection/size; the output is committed so the
 * client never bundles d3-geo or topojson.
 */
import topology from 'world-atlas/countries-110m.json';
import type { Topology } from 'topojson-specification';
import { buildWorldMap } from './lib/worldMap';

const OUT = new URL('../src/data/world-map.json', import.meta.url);
const snapshot = buildWorldMap(topology as unknown as Topology);
await Bun.write(OUT, JSON.stringify(snapshot));
console.log(`Wrote ${snapshot.countries.length} countries to ${OUT.pathname}`);
