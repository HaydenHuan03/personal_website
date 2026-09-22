import { useMemo } from 'react';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Box2, ExtrudeGeometry, Vector2 } from 'three';

interface CountryGroundProps {
  /** SVG path data for the country outline, in the world map's projected space. */
  d: string;
  /** Centroid of that outline, in the same coordinates. */
  centroid: [number, number];
  /** Longest horizontal dimension of the slab, in scene units. */
  size?: number;
}

/** Thickness of the slab as a fraction of its longest side. */
const THICKNESS = 0.02;

/**
 * The country as a slab lying on the ground plane (X/Z), so a landmark placed
 * at the origin stands perpendicular to it on the Y axis - a real 90 degrees
 * inside one 3D scene, rather than a map tilted in CSS with a billboard pasted
 * in front of it.
 */
export default function CountryGround({ d, centroid, size = 2.4 }: CountryGroundProps) {
  const geometry = useMemo(() => {
    const parsed = new SVGLoader().parse(
      `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
    );
    const shapes = parsed.paths.flatMap((path) => SVGLoader.createShapes(path));

    // Measure in the source coordinates so the extrusion depth can be a
    // fraction of the country's own size rather than an absolute guess.
    const bounds = new Box2();
    for (const shape of shapes) {
      for (const p of shape.getPoints(8)) bounds.expandByPoint(new Vector2(p.x, p.y));
    }
    const span = bounds.getSize(new Vector2());
    const longest = Math.max(span.x, span.y, 0.001);

    const geo = new ExtrudeGeometry(shapes, {
      depth: longest * THICKNESS,
      bevelEnabled: false,
    });
    // SVG's y axis points down; flipping it keeps the country the right way
    // round once the slab is laid flat (so the centroid's y flips too).
    geo.scale(1, -1, 1);
    // Centre on the centroid, not the bounding box: outlying islands would
    // drag a bbox centre away from the mainland the landmark stands on.
    geo.translate(-centroid[0], centroid[1], 0);
    const scale = size / longest;
    geo.scale(scale, scale, scale);
    geo.computeVertexNormals();
    return geo;
  }, [d, centroid, size]);

  return (
    // Lay the slab down: its extrusion depth becomes thickness in Y.
    <mesh geometry={geometry} rotation-x={-Math.PI / 2}>
      <meshStandardMaterial color="#3f7d78" roughness={0.9} metalness={0} />
    </mesh>
  );
}
