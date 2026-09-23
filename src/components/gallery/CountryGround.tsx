import { useEffect, useMemo } from 'react';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Box2, BufferAttribute, ExtrudeGeometry, Vector2 } from 'three';
import { createCliffTexture, createLandTexture } from './terrain';
import { landAnchor, largestRing } from '../../utils/landAnchor';

interface CountryGroundProps {
  /** SVG path data for the country outline, in the world map's projected space. */
  d: string;
  /** Centroid of that outline; only a fallback, see `landAnchor`. */
  centroid: [number, number];
  /** Longest horizontal dimension of the slab, in scene units. */
  size?: number;
}

/**
 * Thickness of the slab as a fraction of its longest side. Thick enough that
 * the extruded side walls are a visible band under the top face - that band is
 * the cue that the country is a solid object seen at an angle rather than a
 * flat picture.
 */
const THICKNESS = 0.055;

/** Height of the slab's top face for a given `size`, i.e. where things stand. */
export const slabTop = (size: number) => size * THICKNESS;

/** How often the strata repeat around the slab's perimeter. */
const CLIFF_REPEAT = 6;

/**
 * The country as a slab lying on the ground plane (X/Z), so a landmark placed
 * at the origin stands perpendicular to it on the Y axis - a real 90 degrees
 * inside one 3D scene, rather than a map tilted in CSS with a billboard pasted
 * in front of it.
 */
export default function CountryGround({ d, centroid, size = 2.4 }: CountryGroundProps) {
  const { geometry, land, cliff } = useMemo(() => {
    const parsed = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
    );
    const shapes = parsed.paths.flatMap((path) => path.toShapes());

    // Measure in the source coordinates so the extrusion depth can be a
    // fraction of the country's own size rather than an absolute guess, and so
    // the land texture can be drawn in those same coordinates.
    const contours = shapes.map((shape) => shape.getPoints(12));
    const bounds = new Box2();
    for (const contour of contours) {
      for (const p of contour) bounds.expandByPoint(new Vector2(p.x, p.y));
    }
    const span = bounds.getSize(new Vector2());

    // Scale to the mainland's own extent, not the full bounds. Taiwan's
    // bounding box is 2.4x the island's width because Penghu sits far to the
    // west of it, and normalising to that shrinks the mainland and strands it
    // off to one side of the stage.
    const main = largestRing(contours);
    const mainBounds = new Box2();
    for (const p of main ?? []) mainBounds.expandByPoint(new Vector2(p.x, p.y));
    const mainSpan = main ? mainBounds.getSize(new Vector2()) : span;
    const longest = Math.max(mainSpan.x, mainSpan.y, 0.001);

    // Where the landmark stands. The projected centroid is averaged over every
    // polygon, so Penghu, Kinmen and Matsu pull Taiwan's off the island the
    // tower belongs on; the deepest inland point of the largest landmass is
    // both always on land and what the eye reads as the country's middle.
    const found = landAnchor(contours);
    const anchor: [number, number] = found ? [found.x, found.y] : centroid;

    const geo = new ExtrudeGeometry(shapes, {
      depth: longest * THICKNESS,
      bevelEnabled: false,
    });
    // Centre on that anchor, so the origin the landmark stands at is the
    // middle of the land rather than the middle of the bounding box.
    // Note there is deliberately no y flip here. Negating one axis mirrors the
    // geometry, which reverses every triangle's winding, and the recomputed
    // normals then point into the slab - the lit face becomes the underside
    // and the ground reads upside down. The SVG's downward y axis is handled
    // by the mesh's rotation and by the UVs instead, both of which preserve
    // handedness.
    geo.translate(-anchor[0], -anchor[1], 0);
    const scale = size / longest;
    geo.scale(scale, scale, scale);
    geo.computeVertexNormals();

    // Rebuild the UVs from the final positions. Extrusion generates them in
    // the raw SVG coordinate space, which is both huge and pre-transform;
    // doing it here means the top face maps exactly onto the drawn outline and
    // the walls map onto their own height.
    const position = geo.attributes.position;
    const uv = new Float32Array(position.count * 2);
    const width = span.x * scale;
    const height = span.y * scale;
    const depth = longest * THICKNESS * scale;
    // Where the outline's top-left corner ended up after the transforms above.
    // The canvas is drawn in the same downward-y space as the source path, and
    // a texture's v runs upward, so v is the complement of the local y - this
    // is the y flip, done in UV space where it cannot invert any normals.
    const originX = (bounds.min.x - anchor[0]) * scale;
    const originY = (bounds.min.y - anchor[1]) * scale;
    for (const group of geo.groups) {
      const end = group.start + group.count;
      for (let i = group.start; i < end; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        if (group.materialIndex === 0) {
          // Top and bottom caps: planar, normalised to the outline's bounds.
          uv[i * 2] = (x - originX) / width;
          uv[i * 2 + 1] = 1 - (y - originY) / height;
        } else {
          // Side walls: around the perimeter, then up the cut. Local z grows
          // downward once the slab is laid down, so v is complemented too,
          // putting the topsoil at the surface.
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
    // Lay the slab down. A positive quarter turn keeps the transform a pure
    // rotation (a mirror would flip the winding), sends the outline's +y -
    // southward on the map - toward the viewer, and puts the extrusion's
    // near cap on top; lifting the mesh by its own thickness then rests the
    // ground exactly on y = slabTop(size), where the landmark stands.
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
