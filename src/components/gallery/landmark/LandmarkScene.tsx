import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import PreviewLandmark from './PreviewLandmark';
import SceneEnvironment from '@/components/gallery/SceneEnvironment';

interface LandmarkSceneProps {
  model: string;
}

export default function LandmarkScene({ model }: LandmarkSceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      // Camera looks straight at the centred model. The angled view comes
      // from rotating the model, not the camera.
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
        <PreviewLandmark model={model} />
      </Suspense>
    </Canvas>
  );
}
