import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import '@/components/gallery/quietThree';
import SceneEnvironment from '@/components/gallery/SceneEnvironment';
import CountryGround, { slabTop } from './CountryGround';
import StandingLandmark from '@/components/gallery/landmark/StandingLandmark';
import { CLIMB_MS, easeOut } from '@/components/gallery/transition';

interface CountrySceneProps {
  /** Country outline as SVG path data, in world-map coordinates. */
  d: string;
  /** Centre of the outline; a fallback for where the landmark stands. */
  centroid: [number, number];
  model: string;
  /** Skip the fly-in and start in the resting view. */
  reducedMotion: boolean;
  /** Whether the camera is moving. False while the scene waits hidden behind the globe. */
  active: boolean;
  /** 'in' descends to the resting view; 'out' climbs back to overhead. */
  direction: 'in' | 'out';
  /** Called once the land and the model have loaded. */
  onReady?: () => void;
  /** 0 at rest, 1 pulled back and up. Driven by scrolling into the photos. */
  recede?: RefObject<number>;
}

/** Longest horizontal dimension of the country slab, in scene units. */
const SIZE = 2.1;
/** The point the camera looks at: a little above the land. */
const TARGET: [number, number, number] = [0, 0.6, 0];

/**
 * Camera positions around TARGET (distance, height angle, turn angle). The
 * camera starts looking down from above, matching the end of the globe's zoom,
 * then settles at a three-quarter view. START can't be much closer or the
 * camera passes through the top of the tower.
 */
const START = { radius: 2.0, elevation: 1.5, azimuth: 0.5 };
const REST = { radius: 4.35, elevation: 0.46, azimuth: 0.5 };
/** Where the camera pulls back to as the page scrolls into the photos. */
const RECEDED = { radius: 6.8, elevation: 0.95 };
/** Slow sway around the rest position, to show depth. */
const DRIFT = { amplitude: 0.13, speed: 0.22 };
/** How long the camera takes to come down, in seconds. Going back up uses CLIMB_MS. */
const DESCENT_S = 1.8;

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

function CameraRig({
  reducedMotion,
  active,
  direction,
  recede,
}: {
  reducedMotion: boolean;
  active: boolean;
  direction: 'in' | 'out';
  recede?: RefObject<number>;
}) {
  const { camera } = useThree();
  // 0 is overhead, 1 is the resting view. Going back runs it in reverse.
  const progress = useRef(reducedMotion && direction === 'in' ? 1 : 0);

  useFrame((state, delta) => {
    if (active) {
      if (direction === 'in') {
        progress.current = Math.min(1, progress.current + delta / DESCENT_S);
      } else {
        progress.current = Math.max(0, progress.current - delta / (CLIMB_MS / 1000));
      }
    }
    // Starts fast, continuing the globe's zoom without a pause.
    const p = progress.current;
    const t = easeOut(p);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    // Sway only after landing, and never with reduced motion.
    const drift =
      reducedMotion || p < 1 ? 0 : Math.sin(state.clock.elapsedTime * DRIFT.speed) * DRIFT.amplitude;
    const away = recede?.current ?? 0;
    placeCamera(
      camera,
      lerp(START.radius, REST.radius) + (RECEDED.radius - REST.radius) * away,
      lerp(START.elevation, REST.elevation) + (RECEDED.elevation - REST.elevation) * away,
      lerp(START.azimuth, REST.azimuth) + drift
    );
  });

  return null;
}

/** Placed inside Suspense, so its effect only runs after the land and model have loaded. */
function ReadyBeacon({ onReady }: { onReady?: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    // Draw one frame now, so the scene is ready before it fades in.
    invalidate();
    onReady?.();
  }, [onReady, invalidate]);
  return null;
}

export default function CountryScene({
  d,
  centroid,
  model,
  reducedMotion,
  active,
  direction,
  onReady,
  recede,
}: CountrySceneProps) {
  const top = slabTop(SIZE);

  return (
    <Canvas
      dpr={[1, 2]}
      // Only redraw every frame while the camera is moving.
      frameloop={active ? 'always' : 'demand'}
      shadows="percentage"
      camera={{ fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      // Not interactive; without this it would block clicks on the globe underneath.
      style={{ background: 'transparent', pointerEvents: 'none' }}
      onCreated={({ camera }) => {
        // Reduced motion starts at rest; otherwise start overhead.
        const from = reducedMotion && direction === 'in' ? REST : START;
        placeCamera(camera, from.radius, from.elevation, from.azimuth);
      }}
    >
      <CameraRig reducedMotion={reducedMotion} active={active} direction={direction} recede={recede} />
      <SceneEnvironment />
      <ambientLight intensity={0.35} />
      {/* Main light. Its shadow shows the tower standing on the land. */}
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
        <ReadyBeacon onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
