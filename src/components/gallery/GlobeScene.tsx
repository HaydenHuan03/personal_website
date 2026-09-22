import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { Mesh, PerspectiveCamera } from 'three';
import equirectJson from '../../data/world-equirect.json';
import type { WorldMapSnapshot } from '../../../scripts/lib/worldMap';
import {
  facingRotation,
  pickVisited,
  sphereUv,
  texturePointOnSphere,
  uvToTexture,
  type GlobeRotation,
} from '../../utils/globe';
import { createGlobeTexture } from './globeTexture';
import SceneEnvironment from './SceneEnvironment';

/**
 * The globe's own outlines, in plate carree. Imported here rather than in the
 * page so it travels in this chunk: the server-rendered flat map must not pay
 * to download a projection it never draws.
 */
const GLOBE = equirectJson as unknown as WorldMapSnapshot;

const RADIUS = 1;
/** How far the pointer may travel during a press and still count as a click. */
const CLICK_SLOP = 6;
/** Radians of rotation per pixel dragged. */
const DRAG_SPEED = 0.006;
/** Stop short of the poles, so the globe cannot be tumbled upside down. */
const MAX_PITCH = 1.1;
/** The selection move: spin the country round, dive towards it, then hand over. */
const SPIN_MS = 1150;
/** When the canvas starts fading, so the stage is not a hard cut. */
const FADE_AT_MS = 820;
/** How long that fade runs; the hand-off waits for it. */
const FADE_MS = 330;
/** How close the dive gets, as a fraction of the fitted distance. */
const ZOOM_TO = 0.42;
/** Fraction of the frame left as space around the globe. */
const FIT_MARGIN = 1.16;

export interface GlobeSceneProps {
  visitedIds: ReadonlySet<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/** Yaw and pitch that bring a texture-space point round to face the camera. */
function facing(x: number, y: number): GlobeRotation {
  return facingRotation(texturePointOnSphere({ x, y }, GLOBE.viewBox));
}

/**
 * Where the globe starts: facing the middle of everywhere that has been
 * visited. Left at zero it would open on the mid-Pacific, with every visited
 * country round the back - the same problem the flat map's initial scroll
 * position solved.
 */
function openingRotation(visitedIds: ReadonlySet<string>): GlobeRotation {
  const visited = GLOBE.countries.filter((c) => visitedIds.has(c.id));
  if (!visited.length) return { yaw: 0, pitch: 0 };
  const x = visited.reduce((sum, c) => sum + c.centroid[0], 0) / visited.length;
  const y = visited.reduce((sum, c) => sum + c.centroid[1], 0) / visited.length;
  return facing(x, y);
}

/**
 * Pulls the camera back far enough that the whole sphere fits the frame.
 *
 * A fixed camera distance cannot do this: the visible height at a given
 * distance is `2 * d * tan(fov / 2)`, so the sphere was being cropped top and
 * bottom whenever that came to less than its diameter, and a tall narrow frame
 * crops the sides instead because horizontal field of view shrinks with the
 * aspect ratio. Both cases are solved by taking whichever distance is larger
 * and re-fitting on every resize.
 */
function FitCamera({
  distanceRef,
  radius = RADIUS,
  margin = FIT_MARGIN,
}: {
  distanceRef: React.RefObject<number>;
  radius?: number;
  margin?: number;
}) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const view = camera as PerspectiveCamera;
    const vertical = (view.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * view.aspect);
    const distance =
      Math.max(radius / Math.tan(vertical / 2), radius / Math.tan(horizontal / 2)) * margin;
    // Recorded rather than only applied, because the dive on selection scales
    // this distance and has to know what it is at the current frame size.
    distanceRef.current = distance;
    view.position.set(0, 0, distance);
    view.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, radius, margin, invalidate, distanceRef]);

  return null;
}

interface DragState {
  active: boolean;
  x: number;
  y: number;
  travel: number;
}

interface EarthProps extends GlobeSceneProps {
  rotation: React.RefObject<GlobeRotation>;
  drag: React.RefObject<DragState>;
  /** The fitted camera distance, which the dive scales down from. */
  distance: React.RefObject<number>;
  /** Where to spin to, or null to stay under the pointer's control. */
  target: GlobeRotation | null;
}

function Earth({
  visitedIds,
  hoveredId,
  onHover,
  onSelect,
  rotation,
  drag,
  distance,
  target,
}: EarthProps) {
  const meshRef = useRef<Mesh>(null);
  const dive = useRef(0);
  const { invalidate, gl, camera } = useThree();

  const painted = useMemo(
    () =>
      createGlobeTexture({
        countries: GLOBE.countries,
        visitedIds,
        viewBox: GLOBE.viewBox,
      }),
    [visitedIds]
  );

  useEffect(() => () => painted?.dispose(), [painted]);

  // Hover is a repaint of the texture, not state on the mesh: putting it in
  // the scene graph would re-render the canvas on every pointer move.
  useEffect(() => {
    painted?.setHovered(hoveredId);
    invalidate();
  }, [painted, hoveredId, invalidate]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (target) {
      const ease = Math.min(1, delta * 3.5);
      rotation.current.yaw += (target.yaw - rotation.current.yaw) * ease;
      rotation.current.pitch += (target.pitch - rotation.current.pitch) * ease;

      // Dive towards the country that is now facing us. Held slightly behind
      // the spin so the turn reads first and the approach second, rather than
      // the two cancelling into a straight push-in.
      dive.current = Math.min(1, dive.current + delta / (SPIN_MS / 1000));
      const t = dive.current;
      const eased = t * t * (3 - 2 * t);
      camera.position.z = distance.current * (1 - (1 - ZOOM_TO) * eased);
      invalidate();
    }

    // Order matters: `facingRotation` is solved for three's default XYZ, i.e.
    // Rx * Ry. Changing this silently breaks the spin-to-face.
    mesh.rotation.order = 'XYZ';
    mesh.rotation.y = rotation.current.yaw;
    mesh.rotation.x = rotation.current.pitch;
  });

  /** The country under an intersection, via the texture the sphere wears. */
  const pick = (event: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const mesh = meshRef.current;
    if (!mesh) return null;
    const local = mesh.worldToLocal(event.point.clone());
    const [u, v] = sphereUv(local, RADIUS);
    // Only visited countries are pickable at all; the rest is scenery.
    return pickVisited(uvToTexture(u, v, GLOBE.viewBox), GLOBE.countries, visitedIds);
  };

  return (
    <mesh
      ref={meshRef}
      // Hover and click stay on the mesh, because both need the ray's hit
      // point. Dragging does not, and lives on the canvas instead - see
      // GlobeScene, where it keeps working past the globe's edge.
      onPointerMove={(event) => {
        if (drag.current.active || target) return;
        const hit = pick(event);
        gl.domElement.style.cursor = hit ? 'pointer' : 'grab';
        if (hit !== hoveredId) onHover(hit);
      }}
      onPointerOut={() => {
        if (drag.current.active) return;
        gl.domElement.style.cursor = 'grab';
        onHover(null);
      }}
      onClick={(event) => {
        // A click that dragged the globe round was a drag, not a click.
        if (target || drag.current.travel > CLICK_SLOP) return;
        const id = pick(event);
        if (id) onSelect(id);
      }}
    >
      <sphereGeometry args={[RADIUS, 96, 64]} />
      <meshStandardMaterial map={painted?.texture ?? null} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

/**
 * A draggable earth. It never moves on its own, so the render loop runs on
 * demand: nothing is drawn between a drag, a hover repaint and a selection
 * spin, which is what keeps an idle globe free on a phone battery.
 */
export default function GlobeScene(props: GlobeSceneProps) {
  const [target, setTarget] = useState<GlobeRotation | null>(null);
  const [leaving, setLeaving] = useState(false);
  const distance = useRef(1);
  const rotation = useRef<GlobeRotation>(openingRotation(props.visitedIds));
  const drag = useRef<DragState>({ active: false, x: 0, y: 0, travel: 0 });
  const invalidateRef = useRef<() => void>(() => {});
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    },
    []
  );

  const select = (id: string) => {
    const country = GLOBE.countries.find((c) => c.id === id);
    if (!country) return;
    // Spin it round and dive towards it, fade, and only then hand over - the
    // stage arriving on the click itself reads as a page jump, not a move.
    setTarget(facing(country.centroid[0], country.centroid[1]));
    timers.current.push(window.setTimeout(() => setLeaving(true), FADE_AT_MS));
    timers.current.push(window.setTimeout(() => props.onSelect(id), FADE_AT_MS + FADE_MS));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (target) return;
    drag.current = { active: true, x: event.clientX, y: event.clientY, travel: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.travel += Math.abs(dx) + Math.abs(dy);
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    rotation.current.yaw += dx * DRAG_SPEED;
    rotation.current.pitch = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, rotation.current.pitch + dy * DRAG_SPEED)
    );
    invalidateRef.current();
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.style.cursor = 'grab';
    // `travel` deliberately survives until the next pointerdown zeroes it: the
    // click event lands after this handler, and that is what reads it.
  };

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 0, 4], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        background: 'transparent',
        cursor: 'grab',
        touchAction: 'pan-y',
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
      onCreated={({ invalidate }) => {
        invalidateRef.current = invalidate;
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <FitCamera distanceRef={distance} />
      <SceneEnvironment />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 2, 4]} intensity={1.15} />
      <Earth
        {...props}
        onSelect={select}
        rotation={rotation}
        drag={drag}
        distance={distance}
        target={target}
      />
    </Canvas>
  );
}
