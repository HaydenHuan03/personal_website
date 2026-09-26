import { useEffect, useMemo } from 'react';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Box2, BufferAttribute, ExtrudeGeometry, Vector2 } from 'three';
import { createCliffTexture, createLandTexture } from './terrain';
import { landAnchor, largestRing, significantRings } from '@/lib/landAnchor';

interface CountryGroundProps {
  /** Country outline as SVG path data, in world-map coordinates. */
  d: string;
  /** Centre of the outline; only used if `landAnchor` finds nothing. */
  centroid: [number, number];
  /** Longest horizontal dimension of the slab, in scene units. */
  size?: number;
}

/** Slab thickness as a fraction of its longest side, so the side walls show. */
const THICKNESS = 0.055;

/** Height of the slab's top face, where the landmark stands. */
export const slabTop = (size: number) => size * THICKNESS;

/** Islands smaller than this share of the mainland are dropped. */
const MIN_ISLAND_SHARE = 0.01;

/** How many times the cliff texture repeats around the edge. */
const CLIFF_REPEAT = 6;

/** The country as a flat 3D slab lying on the ground, with the landmark standing at its centre. */
export default function CountryGround({ d, centroid, size = 2.4 }: CountryGroundProps) {
  const { geometry, land, cliff } = useMemo(() => {
    const parsed = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
    );
    // Drop tiny islands; they look like stray blocks next to the landmark.
    const allShapes = parsed.paths.flatMap((path) => path.toShapes());
    const allContours = allShapes.map((shape) => shape.getPoints(12));
    const kept = significantRings(allContours, MIN_ISLAND_SHARE);
    const shapes = kept.map((i) => allShapes[i]);

    // Measure in the original path coordinates, which the land texture also uses.
    const contours = kept.map((i) => allContours[i]);
    const bounds = new Box2().setFromPoints(contours.flat());
    const span = bounds.getSize(new Vector2());

    // Size by the mainland alone, so far-off islands don't shrink it.
    const main = largestRing(contours);
    const mainSpan = main ? new Box2().setFromPoints([...main]).getSize(new Vector2()) : span;
    const longest = Math.max(mainSpan.x, mainSpan.y, 0.001);

    // The landmark stands at the most inland point of the mainland.
    const found = landAnchor(contours);
    const anchor: [number, number] = found ? [found.x, found.y] : centroid;

    const geo = new ExtrudeGeometry(shapes, {
      depth: longest * THICKNESS,
      bevelEnabled: false,
    });
    // Move the anchor to the origin. Don't flip y here: that turns the slab
    // inside out. The mesh rotation and the UVs handle SVG's downward y.
    geo.translate(-anchor[0], -anchor[1], 0);
    const scale = size / longest;
    geo.scale(scale, scale, scale);
    geo.computeVertexNormals();

    // Rebuild the UVs from the final positions, so the textures line up.
    const position = geo.attributes.position;
    const uv = new Float32Array(position.count * 2);
    const width = span.x * scale;
    const height = span.y * scale;
    const depth = longest * THICKNESS * scale;
    // Where the outline's top-left corner ended up. v is flipped (1 - y)
    // because the texture was drawn with y pointing down.
    const originX = (bounds.min.x - anchor[0]) * scale;
    const originY = (bounds.min.y - anchor[1]) * scale;
    for (const group of geo.groups) {
      const end = group.start + group.count;
      for (let i = group.start; i < end; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        if (group.materialIndex === 0) {
          // Top and bottom faces: map the outline's bounds to 0..1.
          uv[i * 2] = (x - originX) / width;
          uv[i * 2 + 1] = 1 - (y - originY) / height;
        } else {
          // Side walls: u runs round the edge, v runs down the wall (flipped so
          // the topsoil is at the top).
          uv[i * 2] = ((x - originX + (y - originY)) / (width + height)) * CLIFF_REPEAT;
          uv[i * 2 + 1] = 1 - z / depth;
        }
      }
    }
    geo.setAttribute('uv', new BufferAttribute(uv, 2));

    return {
      geometry: geo,
      land: createLandTexture({
        d,
        bounds: [bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y],
      }),
      cliff: createCliffTexture(),
    };
  }, [d, centroid, size]);

  useEffect(
    () => () => {
      geometry.dispose();
      land?.dispose();
      cliff?.dispose();
    },
    [geometry, land, cliff]
  );

  return (
    // Rotate the slab to lie flat, then raise it so its top face is at slabTop.
    <mesh
      geometry={geometry}
      rotation-x={Math.PI / 2}
      position-y={slabTop(size)}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        attach="material-0"
        map={land}
        color={land ? '#ffffff' : '#6ea36d'}
        roughness={0.95}
        metalness={0}
      />
      <meshStandardMaterial
        attach="material-1"
        map={cliff}
        color={cliff ? '#ffffff' : '#6b5b46'}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}
