import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import LandmarkModel from './LandmarkModel';
import SceneEnvironment from './SceneEnvironment';

interface LandmarkSceneProps {
  model: string;
}

export default function LandmarkScene({ model }: LandmarkSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Straight-on camera aimed at the origin: the model is centred on the
      // origin, so this guarantees it renders in the middle of the canvas,
      // whose bottom edge is planted on the country. The three-quarter view
      // comes from rotating the model itself, not from moving the camera.
      camera={{ position: [0, 0.22, 1.75], fov: 32 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <SceneEnvironment />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />
      <Suspense fallback={null}>
        <LandmarkModel model={model} />
      </Suspense>
    </Canvas>
  );
}
