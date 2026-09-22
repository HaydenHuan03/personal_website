import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';

export const DRACO_PATH = '/draco/';

interface LandmarkModelProps {
  model: string;
}

/** Fixed three-quarter view: the building stands still on its country. */
const REST_ROTATION_Y = 0.6;

export default function LandmarkModel({ model }: LandmarkModelProps) {
  const { scene } = useGLTF(model, DRACO_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = new MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.85, metalness: 0.05 });
      }
    });
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 1 / Math.max(size.x, size.y, size.z);
    cloned.scale.setScalar(scale);
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [cloned]);

  return (
    <group rotation-y={REST_ROTATION_Y}>
      <primitive object={cloned} />
    </group>
  );
}

export function preloadLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
