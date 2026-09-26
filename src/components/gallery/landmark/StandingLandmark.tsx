import { useLayoutEffect } from 'react';
import { Vector3 } from 'three';
import { useLandmark } from './useLandmark';

interface StandingLandmarkProps {
  model: string;
  /** Height of the building, in scene units. */
  height?: number;
  /** Height of the ground it stands on (the slab's top face). */
  base?: number;
}

/** The landmark standing on the country slab, casting its shadow on the land. */
export default function StandingLandmark({ model, height = 1.9, base = 0 }: StandingLandmarkProps) {
  const { object, meshes, box } = useLandmark(model);

  useLayoutEffect(() => {
    for (const mesh of meshes) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  }, [meshes]);

  useLayoutEffect(() => {
    const span = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = height / Math.max(span.y, 0.001);
    object.scale.setScalar(scale);
    // Centre it horizontally, then drop it so its base rests on the ground.
    object.position.set(
      -centre.x * scale,
      base + (span.y / 2 - centre.y) * scale,
      -centre.z * scale
    );
  }, [object, box, height, base]);

  return <primitive object={object} />;
}
