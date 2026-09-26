import { useLayoutEffect } from 'react';
import { Vector3 } from 'three';
import { useLandmark } from './useLandmark';

interface PreviewLandmarkProps {
  model: string;
}

/** Fixed three-quarter view: the building stands still on its country. */
const REST_ROTATION_Y = 0.6;

export default function PreviewLandmark({ model }: PreviewLandmarkProps) {
  const { object, box } = useLandmark(model);

  useLayoutEffect(() => {
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 1 / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [object, box]);

  return (
    <group rotation-y={REST_ROTATION_Y}>
      <primitive object={object} />
    </group>
  );
}
