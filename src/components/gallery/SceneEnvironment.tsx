import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * A small procedural environment, generated on the GPU rather than fetched:
 * the landmark's glass has nothing to reflect without one, and these scenes
 * are deliberately free of network requests (see the vendored Draco decoder).
 */
export default function SceneEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = target.texture;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}
