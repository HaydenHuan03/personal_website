import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

export const DRACO_PATH = '/draco/';

interface LandmarkModelProps {
  model: string;
  autoRotate: boolean;
}

export default function LandmarkModel({ model, autoRotate }: LandmarkModelProps) {
  const group = useRef<Group>(null);
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

  useFrame((_, delta) => {
    if (autoRotate && group.current) group.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={group}>
      <primitive object={cloned} />
    </group>
  );
}

export function preloadLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
