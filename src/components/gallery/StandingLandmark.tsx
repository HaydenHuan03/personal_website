import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { buildLandmarkMaterial, profileLandmark } from './landmarkMaterial';

/** Draco decoder vendored from three/examples into public/draco - never a CDN. */
export const DRACO_PATH = '/draco/';

interface StandingLandmarkProps {
  model: string;
  /** Height of the building in scene units; it stands from its base upward. */
  height?: number;
  /** Ground height its base rests on, i.e. the top face of the country slab. */
  base?: number;
}

/**
 * The landmark standing on the ground plane: its base sits exactly on the
 * slab's top face, so it meets the country at a true right angle and casts its
 * shadow onto the land it stands on.
 */
export default function StandingLandmark({ model, height = 1.9, base = 0 }: StandingLandmarkProps) {
  const { scene } = useGLTF(model, DRACO_PATH);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const material = useRef<MeshStandardMaterial | null>(null);

  useLayoutEffect(() => {
    // Measure untransformed: this effect re-runs (StrictMode invokes it twice)
    // and measuring an already-scaled model would compute a scale of 1.
    cloned.scale.setScalar(1);
    cloned.position.set(0, 0, 0);
    const box = new Box3().setFromObject(cloned);
    const span = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());

    // The model arrives as one mesh with a single flat grey material and no
    // texture, so its colour has to be derived rather than looked up. The
    // profile finds where the tower actually changes - podium, glass shaft,
    // spire - from the silhouette itself, so the zones land on the real
    // set-backs instead of on guessed fractions.
    const meshes: Mesh[] = [];
    cloned.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    const zones = profileLandmark(meshes, box);
    material.current?.dispose();
    const built = buildLandmarkMaterial(zones);
    material.current = built;
    cloned.traverse((o) => {
      if (o instanceof Mesh) {
        o.material = built;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const scale = height / Math.max(span.y, 0.001);
    cloned.scale.setScalar(scale);
    // Centre it horizontally, then drop it so its base rests on the ground.
    cloned.position.set(
      -centre.x * scale,
      base + (span.y / 2 - centre.y) * scale,
      -centre.z * scale
    );
  }, [cloned, height, base]);

  useLayoutEffect(
    () => () => {
      material.current?.dispose();
      material.current = null;
    },
    []
  );

  return <primitive object={cloned} />;
}

export function preloadStandingLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
