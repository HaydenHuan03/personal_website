import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import CountryGround from './CountryGround';
import StandingLandmark from './StandingLandmark';

interface CountrySceneProps {
  /** Country outline path data, in the world map's projected space. */
  d: string;
  /** Centroid of that outline, where the landmark stands. */
  centroid: [number, number];
  model: string;
  /** Skip the fly-in and start in the resting view. */
  reducedMotion: boolean;
}

const START: [number, number, number] = [0, 5.4, 0.4];
const REST: [number, number, number] = [0, 1.75, 4.1];

/**
 * Eases the camera from straight overhead (where the slab reads as a flat map)
 * down to a three-quarter view, which is what makes the country look like it
 * lies down while the landmark stands up off it.
 */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const progress = useRef(reducedMotion ? 1 : 0);

  useFrame((_, delta) => {
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.55);
    }
    // Smoothstep so it settles rather than stopping dead.
    const t = progress.current * progress.current * (3 - 2 * progress.current);
    camera.position.set(
      START[0] + (REST[0] - START[0]) * t,
      START[1] + (REST[1] - START[1]) * t,
      START[2] + (REST[2] - START[2]) * t
    );
    camera.lookAt(0, 0.55, 0);
  });

  return null;
}

export default function CountryScene({ d, centroid, model, reducedMotion }: CountrySceneProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ position: START, fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <CameraRig reducedMotion={reducedMotion} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[3, 6, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 3, -2]} intensity={0.45} />
      {/* A faint ground disc the country sits on. Without a horizontal
          reference the eye reads the slab as a flat shape facing the camera,
          however correct the geometry is. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[2.4, 64]} />
        <meshStandardMaterial color="#efece8" roughness={1} metalness={0} />
      </mesh>
      <Suspense fallback={null}>
        <CountryGround d={d} centroid={centroid} size={2.1} />
        <StandingLandmark model={model} />
      </Suspense>
      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={6} blur={1.8} far={4} />
    </Canvas>
  );
}
