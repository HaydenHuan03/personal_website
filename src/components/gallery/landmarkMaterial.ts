import { Box3, MeshStandardMaterial, Vector3, type Mesh } from 'three';

/**
 * The landmark model ships as a single mesh with one flat grey material, no
 * texture and no vertex colours, so every bit of its colour has to be derived
 * here. Rather than painting bands at guessed heights, the silhouette is
 * measured first: a tower's podium, its shaft and its spire are all visible as
 * changes in how wide it is at a given height, so the zones land on the
 * building's real set-backs and the same code works for the next landmark.
 */

export interface LandmarkZones {
  /** Model-space y of the base and the total height, for the height ramp. */
  baseY: number;
  spanY: number;
  /** Normalised height where the podium ends and the glass shaft begins. */
  podiumTop: number;
  /** Normalised height where the shaft ends and the spire begins. */
  spireStart: number;
  /** Number of stacked modules detected in the shaft. */
  modules: number;
}

const BINS = 128;

/** Measures max horizontal radius per height band, then reads off the zones. */
export function profileLandmark(meshes: Mesh[], box: Box3): LandmarkZones {
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const baseY = box.min.y;
  const spanY = Math.max(size.y, 1e-6);
  const radii = new Float64Array(BINS);

  const vertex = new Vector3();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const position = mesh.geometry.getAttribute('position');
    if (!position) continue;
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      const h = (vertex.y - baseY) / spanY;
      const bin = Math.min(BINS - 1, Math.max(0, Math.floor(h * BINS)));
      const r = Math.hypot(vertex.x - centre.x, vertex.z - centre.z);
      if (r > radii[bin]) radii[bin] = r;
    }
  }

  // Empty bands (gaps in the mesh) inherit their neighbour so the profile
  // stays continuous and does not read as a set-back.
  for (let i = 1; i < BINS; i++) if (radii[i] === 0) radii[i] = radii[i - 1];
  const maxR = Math.max(...radii, 1e-6);

  // Spire: the run of bands at the top that are a small fraction as wide as
  // the widest part of the building.
  let spireBin = BINS;
  while (spireBin > 0 && radii[spireBin - 1] < maxR * 0.2) spireBin--;
  let spireStart = spireBin / BINS;
  if (spireStart < 0.5 || spireStart > 0.99) spireStart = 0.9;

  // Shaft width, as the median of the bands between podium and spire.
  const shaftBins = radii.slice(Math.floor(BINS * 0.3), Math.floor(BINS * spireStart));
  const sorted = Array.from(shaftBins).sort((a, b) => a - b);
  const shaftR = sorted.length ? sorted[Math.floor(sorted.length / 2)] : maxR;

  // Podium: the highest band in the bottom third that is clearly wider than
  // the shaft above it.
  let podiumBin = 0;
  const podiumLimit = Math.floor(BINS * 0.3);
  for (let i = 0; i < podiumLimit; i++) if (radii[i] > shaftR * 1.12) podiumBin = i + 1;
  const podiumTop = podiumBin ? podiumBin / BINS : 0.05;

  // Modules: each flared section of the shaft ends in a wider lip, so the
  // count of local maxima in the profile is the count of modules. Maxima have
  // to be both prominent and spaced out, or a low-poly silhouette's own
  // jitter would be counted as set-backs.
  let modules = 0;
  let lastPeak = -Infinity;
  const shaftEnd = Math.floor(BINS * spireStart) - 1;
  for (let i = podiumBin + 1; i < shaftEnd; i++) {
    const prominent = radii[i] > radii[i + 1] * 1.02 && radii[i] >= radii[i - 1];
    if (prominent && radii[i] > shaftR * 0.95 && i - lastPeak >= 4) {
      modules++;
      lastPeak = i;
    }
  }
  if (modules < 2 || modules > 16) modules = 8;

  return { baseY, spanY, podiumTop, spireStart, modules };
}

const f = (n: number) => n.toFixed(6);

/**
 * A standard material with the zone colouring injected: stone podium, a
 * blue-green glass shaft banded at every module seam and finely lined at floor
 * pitch, and a bright metal spire. Roughness and metalness switch with the
 * zones too, so the glass actually reflects the environment while the podium
 * stays matte.
 */
export function buildLandmarkMaterial(zones: LandmarkZones): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.4,
    metalness: 0.4,
  });
  material.envMapIntensity = 1.25;

  const { baseY, spanY, podiumTop, spireStart, modules } = zones;
  /** Floor lines per module; anti-aliased away as soon as they go sub-pixel. */
  const floors = 9;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vZoneHeight;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvZoneHeight = (position.y - ${f(baseY)}) / ${f(spanY)};`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZoneHeight;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float zoneH = clamp(vZoneHeight, 0.0, 1.0);
        float isShaft = smoothstep(${f(podiumTop)} - 0.006, ${f(podiumTop)} + 0.006, zoneH);
        float isSpire = smoothstep(${f(spireStart)} - 0.006, ${f(spireStart)} + 0.006, zoneH);
        float shaftT = clamp((zoneH - ${f(podiumTop)}) / ${f(Math.max(spireStart - podiumTop, 1e-3))}, 0.0, 1.0);

        // Podium: pale limestone, a touch darker where it meets the ground.
        vec3 zoneColor = mix(vec3(0.702, 0.671, 0.608), vec3(0.847, 0.827, 0.776), smoothstep(0.0, ${f(Math.max(podiumTop, 1e-3))}, zoneH));

        // Shaft: blue-green glass, cooler and lighter as it climbs.
        vec3 glass = mix(vec3(0.204, 0.373, 0.361), vec3(0.404, 0.635, 0.596), shaftT);

        // Seam between stacked modules, plus the bright lip above each seam.
        float moduleT = fract(shaftT * ${f(modules)});
        float seam = 1.0 - smoothstep(0.0, 0.05, moduleT);
        glass = mix(glass, vec3(0.110, 0.204, 0.204), seam * 0.85);
        glass += vec3(0.10, 0.11, 0.10) * (1.0 - smoothstep(0.05, 0.16, moduleT)) * (1.0 - seam);

        // Floor lines, faded out by fwidth once they stop resolving.
        float floorT = fract(shaftT * ${f(modules * floors)});
        float floorAA = fwidth(shaftT * ${f(modules * floors)}) * 1.5 + 1e-5;
        float floorLine = smoothstep(0.0, floorAA, min(floorT, 1.0 - floorT));
        glass *= mix(0.86, 1.0, floorLine);

        zoneColor = mix(zoneColor, glass, isShaft);
        // Spire: bare metal.
        zoneColor = mix(zoneColor, vec3(0.784, 0.812, 0.824), isSpire);
        diffuseColor.rgb *= zoneColor;`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(0.88, 0.16, isShaft), 0.24, isSpire);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(mix(0.04, 0.55, isShaft), 0.92, isSpire);`
      );
  };

  // Distinct zones mean a distinct program; without this three would reuse a
  // cached one compiled for a differently-zoned landmark.
  material.customProgramCacheKey = () =>
    `landmark:${f(podiumTop)}:${f(spireStart)}:${modules}:${f(baseY)}:${f(spanY)}`;

  return material;
}
