import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import SceneEnvironment from './SceneEnvironment';
import CountryGround, { slabTop } from './CountryGround';
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

/** Longest horizontal dimension of the country slab, in scene units. */
const SIZE = 2.1;
/** What the camera aims at: a little above the land, below the tower's middle. */
const TARGET: [number, number, number] = [0, 0.6, 0];

/**
 * Camera positions as spherical coordinates around TARGET. The fly-in starts
 * almost straight overhead - where the slab reads as the flat map it replaced -
 * and settles at a three-quarter view: high enough that the land is a visible
 * plane receding into the distance, low enough that the tower clearly stands
 * up out of it.
 */
const START = { radius: 5.2, elevation: 1.45, azimuth: 0 };
const REST = { radius: 4.35, elevation: 0.46, azimuth: 0.5 };
/** Slow orbit around the rest position: motion parallax is what sells depth. */
const DRIFT = { amplitude: 0.13, speed: 0.22 };

function placeCamera(
  camera: Camera,
  radius: number,
  elevation: number,
  azimuth: number
) {
  const horizontal = radius * Math.cos(elevation);
  camera.position.set(
    TARGET[0] + horizontal * Math.sin(azimuth),
    TARGET[1] + radius * Math.sin(elevation),
    TARGET[2] + horizontal * Math.cos(azimuth)
  );
  camera.lookAt(TARGET[0], TARGET[1], TARGET[2]);
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const progress = useRef(reducedMotion ? 1 : 0);

  useFrame((state, delta) => {
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 0.55);
    }
    // Smoothstep so it settles rather than stopping dead.
    const p = progress.current;
    const t = p * p * (3 - 2 * p);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    // The drift only opens up once the fly-in has landed, and never for
    // reduced motion - there the view is simply static.
    const drift =
      reducedMotion || p < 1 ? 0 : Math.sin(state.clock.elapsedTime * DRIFT.speed) * DRIFT.amplitude;
    placeCamera(
      camera,
      lerp(START.radius, REST.radius),
      lerp(START.elevation, REST.elevation),
      lerp(START.azimuth, REST.azimuth) + drift
    );
  });

  return null;
}

export default function CountryScene({ d, centroid, model, reducedMotion }: CountrySceneProps) {
  const top = slabTop(SIZE);

  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      onCreated={({ camera }) => {
        const from = reducedMotion ? REST : START;
        placeCamera(camera, from.radius, from.elevation, from.azimuth);
      }}
    >
      <CameraRig reducedMotion={reducedMotion} />
      <SceneEnvironment />
      <ambientLight intensity={0.35} />
      {/* The key light casts: the tower's shadow falling across the country is
          the strongest single cue that it is standing on it, not in front. */}
      <directionalLight
        position={[2.6, 4.4, 2.2]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.1}
        shadow-camera-far={12}
      />
      <directionalLight position={[-4, 2, -2]} intensity={0.35} />
      <Suspense fallback={null}>
        <CountryGround d={d} centroid={centroid} size={SIZE} />
        <StandingLandmark model={model} base={top} />
      </Suspense>
    </Canvas>
  );
}
