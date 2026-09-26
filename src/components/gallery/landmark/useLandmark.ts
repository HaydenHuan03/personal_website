import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh } from 'three';
import { buildLandmarkMaterial, profileLandmark } from './landmarkMaterial';

/** Draco decoder, served from public/draco. */
const DRACO_PATH = '/draco/';

/**
 * Loads the landmark, makes a copy and colours it. Used by the hover preview
 * and the country scene. `box` is measured before any scaling, so each caller
 * can size the model its own way.
 */
export function useLandmark(model: string) {
  const { scene } = useGLTF(model, DRACO_PATH);

  // The model is plain grey, so its colours come from measuring its shape (see landmarkMaterial).
  const { object, meshes, box, zones } = useMemo(() => {
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    const meshes: Mesh[] = [];
    object.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    return { object, meshes, box, zones: profileLandmark(meshes, box) };
  }, [scene]);

  useLayoutEffect(() => {
    const material = buildLandmarkMaterial(zones);
    for (const mesh of meshes) mesh.material = material;
    return () => material.dispose();
  }, [meshes, zones]);

  return { object, meshes, box };
}

export function preloadLandmark(model: string) {
  useGLTF.preload(model, DRACO_PATH);
}
