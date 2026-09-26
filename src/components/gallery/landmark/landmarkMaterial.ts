import { Box3, MeshStandardMaterial, Vector3, type Mesh } from 'three';

/**
 * Colours the landmark, which arrives as one plain grey mesh. It measures how
 * wide the building is at each height to find the podium, shaft and spire,
 * then colours each part differently.
 */

export interface LandmarkZones {
  /** Model y of the base, and the total height. */
  baseY: number;
  spanY: number;
  /** Height (0..1) where the podium ends and the glass shaft begins. */
  podiumTop: number;
  /** Height (0..1) where the shaft ends and the spire begins. */
  spireStart: number;
  /** Number of stacked modules detected in the shaft. */
  modules: number;
}

const BINS = 128;

/** Measures the building's width in height bands, then finds the zones from that. */
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

  // Empty bands copy the band below, so gaps don't look like set-backs.
  for (let i = 1; i < BINS; i++) if (radii[i] === 0) radii[i] = radii[i - 1];
  const maxR = Math.max(...radii, 1e-6);

  // Spire: the thin bands at the top (under 20% of the widest part).
  let spireBin = BINS;
  while (spireBin > 0 && radii[spireBin - 1] < maxR * 0.2) spireBin--;
  let spireStart = spireBin / BINS;
  if (spireStart < 0.5 || spireStart > 0.99) spireStart = 0.9;

  // Shaft width, as the median of the bands between podium and spire.
  const shaftBins = radii.slice(Math.floor(BINS * 0.3), Math.floor(BINS * spireStart));
  const sorted = Array.from(shaftBins).sort((a, b) => a - b);
  const shaftR = sorted.length ? sorted[Math.floor(sorted.length / 2)] : maxR;

  // Podium: the highest band in the bottom third that is clearly wider than the shaft.
  let podiumBin = 0;
  const podiumLimit = Math.floor(BINS * 0.3);
  for (let i = 0; i < podiumLimit; i++) if (radii[i] > shaftR * 1.12) podiumBin = i + 1;
  const podiumTop = podiumBin ? podiumBin / BINS : 0.05;

  // Modules: count the wide lips up the shaft. Peaks must stand out and be
  // spaced apart, so small bumps in the mesh aren't counted.
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
 * A standard material with shader code added for the zones: a stone podium, a
 * glass shaft with module and floor lines, and a metal spire. Roughness and
 * metalness change per zone too.
 */
export function buildLandmarkMaterial(zones: LandmarkZones): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.4,
    metalness: 0.4,
  });
  material.envMapIntensity = 1.25;

  const { baseY, spanY, podiumTop, spireStart, modules } = zones;
  /** Floor lines per module. They fade out when too small to draw cleanly. */
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

        // Floor lines, faded out when they get smaller than a pixel.
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

  // Different zones need a different shader; this stops three reusing a cached one.
  material.customProgramCacheKey = () =>
    `landmark:${f(podiumTop)}:${f(spireStart)}:${modules}:${f(baseY)}:${f(spanY)}`;

  return material;
}
