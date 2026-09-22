import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import LandmarkModel from './LandmarkModel';

interface LandmarkSceneProps {
  model: string;
  autoRotate: boolean;
}

/**
 * The WebGL scene. Imported only through a dynamic import from
 * LandmarkCanvas, so neither three.js nor @react-three/* is ever pulled into
 * the SSR module graph (doing so drags in a second React copy and nulls the
 * hook dispatcher on the Worker).
 */
export default function LandmarkScene({ model, autoRotate }: LandmarkSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [1.2, 0.25, 1.2], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
      <Suspense fallback={null}>
        <LandmarkModel model={model} autoRotate={autoRotate} />
      </Suspense>
    </Canvas>
  );
}
