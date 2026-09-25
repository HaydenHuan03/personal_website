import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import './quietThree';
import SceneEnvironment from './SceneEnvironment';
import CountryGround, { slabTop } from './CountryGround';
import StandingLandmark from './StandingLandmark';
import { CLIMB_MS } from './transition';

interface CountrySceneProps {
  /** Country outline path data, in the world map's projected space. */
  d: string;
  /** Centroid of that outline, where the landmark stands. */
  centroid: [number, number];
  model: string;
  /** Skip the fly-in and start in the resting view. */
  reducedMotion: boolean;
  /**
   * Whether the camera move is running. False while the scene is mounted but
   * still hidden behind the diving globe: it holds the overhead framing so the
   * cross-fade lands on a matching image, and only then starts descending.
   */
  active: boolean;
  /** 'in' descends to the resting view; 'out' climbs back to overhead. */
  direction: 'in' | 'out';
  /** Fired once the slab, its textures and the model are all live. */
  onReady?: () => void;
  /** 0 at rest, 1 drawn back and up; driven by scrolling into the photos. */
  recede?: RefObject<number>;
}

/** Longest horizontal dimension of the country slab, in scene units. */
const SIZE = 2.1;
/** What the camera aims at: a little above the land, below the tower's middle. */
const TARGET: [number, number, number] = [0, 0.6, 0];

/**
 * Camera positions as spherical coordinates around TARGET. The fly-in starts
 * looking straight down from close enough that the land fills the frame - which
 * is what the globe's dive hands over, a screen full of country seen from
 * directly above - and settles at a three-quarter view: high enough that the
 * land is a visible plane receding into the distance, low enough that the tower
 * clearly stands up out of it.
 *
 * The starting radius cannot simply be made smaller and smaller: the landmark
 * is `height` units tall and stands at the origin, so an overhead camera closer
 * than about 2.4 in Y flies through the top of it. This is as close as the move
 * can start without doing that.
 *
 * Both share an azimuth on purpose. Swinging round at the same time as coming
 * down muddies the one thing this move is meant to show, which is the view
 * tipping from overhead to level with the building.
 */
const START = { radius: 2.0, elevation: 1.5, azimuth: 0.5 };
const REST = { radius: 4.35, elevation: 0.46, azimuth: 0.5 };
/** Where the camera draws back to as the name zooms past it towards the photos. */
const RECEDED = { radius: 6.8, elevation: 0.95 };
/** Slow orbit around the rest position: motion parallax is what sells depth. */
const DRIFT = { amplitude: 0.13, speed: 0.22 };
/** The descent, in seconds. The climb back out is CLIMB_MS, i.e. quicker. */
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
  // 0 is overhead, 1 is the resting view. The climb out runs the same number
  // backwards, so the return retraces the arrival rather than cutting.
  const progress = useRef(reducedMotion && direction === 'in' ? 1 : 0);

  useFrame((state, delta) => {
    if (active) {
      if (direction === 'in') {
        progress.current = Math.min(1, progress.current + delta / DESCENT_S);
      } else {
        progress.current = Math.max(0, progress.current - delta / (CLIMB_MS / 1000));
      }
    }
    // Eased out rather than smoothstepped, and for the same reason the globe's
    // dive is eased in: the descent does not begin a move, it continues the one
    // the dive was still accelerating through. Starting it from a standstill is
    // what put a pause in the middle of the zoom.
    const p = progress.current;
    const t = 1 - (1 - p) * (1 - p);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    // The drift only opens up once the fly-in has landed, and never for
    // reduced motion - there the view is simply static.
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

/**
 * Sits inside the Suspense boundary, so its effect cannot run until the slab's
 * siblings have resolved - which is the only honest definition of "the scene is
 * there" available: the model loads through suspense, not through a callback.
 */
function ReadyBeacon({ onReady }: { onReady?: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    // Draw the finished scene once even while the canvas is on demand, so it
    // is ready and compiled by the time the cross-fade reveals it.
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
      // Hidden and motionless until active, so it only needs drawing when
      // something changes; rendering every frame there doubled the GPU work of
      // the globe's dive on phones.
      frameloop={active ? 'always' : 'demand'}
      shadows="percentage"
      camera={{ fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      // Never interactive, and it now waits invisibly over the globe while the
      // map is up; R3F defaults its wrapper to 'auto', which would eat the
      // globe's hover and clicks.
      style={{ background: 'transparent', pointerEvents: 'none' }}
      onCreated={({ camera }) => {
        // Reduced motion has no move to make, so it opens at rest; everything
        // else opens overhead, matched to where the globe's dive ended.
        const from = reducedMotion && direction === 'in' ? REST : START;
        placeCamera(camera, from.radius, from.elevation, from.azimuth);
      }}
    >
      <CameraRig reducedMotion={reducedMotion} active={active} direction={direction} recede={recede} />
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
        <ReadyBeacon onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
