import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { buildLandmarkMaterial, profileLandmark } from './landmarkMaterial';

export const DRACO_PATH = '/draco/';

interface LandmarkModelProps {
  model: string;
}

/** Fixed three-quarter view: the building stands still on its country. */
const REST_ROTATION_Y = 0.6;

export default function LandmarkModel({ model }: LandmarkModelProps) {
  const { scene } = useGLTF(model, DRACO_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const material = useRef<MeshStandardMaterial | null>(null);

  useLayoutEffect(() => {
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    const box = new Box3().setFromObject(cloned);

    // Same derived colouring as the full stage, so the hover preview and the
    // country scene are unmistakably the same building.
    const meshes: Mesh[] = [];
    cloned.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    material.current?.dispose();
    const built = buildLandmarkMaterial(profileLandmark(meshes, box));
    material.current = built;
    for (const mesh of meshes) mesh.material = built;

    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = 1 / Math.max(size.x, size.y, size.z);
    cloned.scale.setScalar(scale);
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }, [cloned]);

  useLayoutEffect(
    () => () => {
      material.current?.dispose();
      material.current = null;
    },
    []
  );

  return (
    <group rotation-y={REST_ROTATION_Y}>
      <primitive object={cloned} />
    </group>
  );
}

export function preloadLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
