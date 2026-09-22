import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';

/** Draco decoder vendored from three/examples into public/draco - never a CDN. */
export const DRACO_PATH = '/draco/';

interface StandingLandmarkProps {
  model: string;
  /** Height of the building in scene units; it stands from y=0 upward. */
  height?: number;
}

/**
 * The landmark standing on the ground plane: its base sits exactly at y=0, so
 * it meets the country slab at a true right angle.
 */
export default function StandingLandmark({ model, height = 1.9 }: StandingLandmarkProps) {
  const { scene } = useGLTF(model, DRACO_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.material = new MeshStandardMaterial({
          color: '#e7e5e4',
          roughness: 0.75,
          metalness: 0.05,
        });
      }
    });
    // Measure untransformed: this effect re-runs (StrictMode invokes it twice)
    // and measuring an already-scaled model would compute a scale of 1.
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    const box = new Box3().setFromObject(cloned);
    const span = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = height / Math.max(span.y, 0.001);
    cloned.scale.setScalar(scale);
    // Centre it horizontally, then drop it so its base rests on the ground.
    cloned.position.set(-centre.x * scale, (span.y / 2 - centre.y) * scale, -centre.z * scale);
  }, [cloned, height]);

  return <primitive object={cloned} />;
}

export function preloadStandingLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
