import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ArrowRight } from 'lucide-react';
import { Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
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
import './quietThree';
import SceneEnvironment from './SceneEnvironment';
import { DIVE_MS, PULL_OUT_MS, ZOOM_FLOOR, ZOOM_TO } from './transition';

/**
 * The globe's own outlines, in plate carree. Imported here rather than in the
 * page so it travels in this chunk: the server-rendered flat map must not pay
 * to download a projection it never draws.
 */
const GLOBE = equirectJson as unknown as WorldMapSnapshot;

/** NASA Blue Marble (July 2004), plate carree, 2048x1024. */
const EARTH_IMAGERY = '/gallery/earth.webp';

const RADIUS = 1;
/** How far the pointer may travel during a press and still count as a click. */
const CLICK_SLOP = 6;
/** Radians of rotation per pixel dragged. */
const DRAG_SPEED = 0.006;
/** Stop short of the poles, so the globe cannot be tumbled upside down. */
const MAX_PITCH = 1.1;
/** Fraction of the frame left as space around the globe. */
const FIT_MARGIN = 1.16;
/** How far a label's country may turn towards the limb before it hides:
 * the cosine between the surface normal and the view direction. */
const LABEL_MIN_FACING = 0.2;
const labelWorld = new Vector3();
const labelView = new Vector3();

export interface GlobeSceneProps {
  visitedIds: ReadonlySet<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /**
   * Open facing this country, already dived in, instead of at the opening
   * rotation. This is what makes the return a move rather than a cut: the
   * globe comes back exactly where the country stage was standing.
   */
  resumeId?: string | null;
  /** Run the pull-back out of the dive. Only meaningful alongside `resumeId`. */
  pullOut?: boolean;
  /** Label every visited country, not just the hovered one: for touch, which has no hover. */
  alwaysLabel?: boolean;
  /**
   * Spin round and dive towards this country. Owned by the page, so a
   * selection from outside the canvas (keyboard, the country buttons) gets the
   * same move as a click on the globe.
   */
  diveId?: string | null;
  /** Fired once the sphere has actually drawn a frame. */
  onReady?: () => void;
}

/** Smoothstep. For the turn, which does have to settle: it has arrived. */
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * The dive's own curve, and its gradient where it ends.
 *
 * Deliberately not a smoothstep. The dive does not finish a move - it is
 * interrupted by the cross-fade, and the country's camera carries on from
 * there. Easing out into a scene that eases in leaves both at zero speed
 * across the seam, which is the pause this replaces. So it starts with enough
 * speed to answer the click and is still accelerating when it is handed over.
 */
const dip = (t: number) => 0.35 * t + 0.65 * t * t;
const DIP_END_SLOPE = 0.35 + 2 * 0.65;

/** Starts at speed and settles: the far side of a hand-off. */
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** Yaw and pitch that bring a texture-space point round to face the camera. */
function facing(x: number, y: number): GlobeRotation {
  return facingRotation(texturePointOnSphere({ x, y }, GLOBE.viewBox));
}

/** The country's facing rotation, by id. */
function facingCountry(id: string): GlobeRotation | null {
  const country = GLOBE.countries.find((c) => c.id === id);
  return country ? facing(country.centroid[0], country.centroid[1]) : null;
}

/**
 * The equivalent of `to` that is nearest `from`.
 *
 * Yaw is an angle, so 170 degrees and -190 degrees are the same heading. Lerped
 * raw, a country just past the seam spins nearly all the way round the globe to
 * reach a point it was already next to.
 */
function nearestYaw(from: number, to: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
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
  zoomRef,
  radius = RADIUS,
  margin = FIT_MARGIN,
}: {
  distanceRef: React.RefObject<number>;
  /** Current dive, as a fraction of the fitted distance. */
  zoomRef: React.RefObject<number>;
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
    // Scaled by the dive, so a resize mid-transition re-fits without undoing it.
    view.position.set(0, 0, distance * zoomRef.current);
    view.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, radius, margin, invalidate, distanceRef, zoomRef]);

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
  /** The dive itself, as a fraction of that distance. */
  zoom: React.RefObject<number>;
  /** Where to spin to, or null to stay under the pointer's control. */
  target: GlobeRotation | null;
}

/**
 * A visited country's beacon, and its name when `named`, pinned to it on the
 * sphere. The beacon pulses so the country reads as clickable before anyone
 * hovers it. Hidden once the country turns towards the limb or round the back:
 * the globe is centred on the origin, so the anchor's own position is its
 * surface normal.
 */
function CountryLabel({ id, named, hovered }: { id: string; named: boolean; hovered: boolean }) {
  const country = GLOBE.countries.find((c) => c.id === id);
  const groupRef = useRef<Group>(null);
  // State, not a ref on the element: Html renders into its own root, which is
  // not attached yet on the single frame an on-demand globe draws after a hover.
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const position = useMemo(() => {
    if (!country) return null;
    const p = texturePointOnSphere({ x: country.centroid[0], y: country.centroid[1] }, GLOBE.viewBox);
    return [p.x * RADIUS, p.y * RADIUS, p.z * RADIUS] as const;
  }, [country]);

  useFrame(({ camera }) => {
    const group = groupRef.current;
    if (!group) return;
    group.getWorldPosition(labelWorld);
    labelView.subVectors(camera.position, labelWorld).normalize();
    const next = labelWorld.normalize().dot(labelView) > LABEL_MIN_FACING;
    if (next !== visibleRef.current) {
      visibleRef.current = next;
      setVisible(next);
    }
  });

  if (!country || !position) return null;
  return (
    <group ref={groupRef} position={position}>
      <Html zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <span
            aria-hidden
            className={`absolute -left-3 -top-3 size-6 rounded-full border-2 border-white transition-transform duration-200 ${
              hovered ? 'scale-150 bg-white/30' : 'motion-safe:animate-ping'
            }`}
          />
          {named && (
            <span className="absolute left-0 top-0 inline-flex -translate-x-1/2 -translate-y-[calc(100%+1rem)] items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-900 px-3 py-1 text-sm font-medium text-stone-50 shadow-md">
              {country.name}
              {hovered && (
                <>
                  <span className="text-stone-400">·</span>
                  <span className="text-accent-soft">Explore</span>
                  <ArrowRight size={14} className="text-accent-soft" />
                </>
              )}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

function Earth({
  visitedIds,
  hoveredId,
  alwaysLabel = false,
  onHover,
  onSelect,
  pullOut = false,
  onReady,
  rotation,
  drag,
  distance,
  zoom,
  target,
}: EarthProps) {
  const meshRef = useRef<Mesh>(null);
  /** The dive in: progress, and the rotation it started from. */
  const dive = useRef({ progress: 0, from: null as GlobeRotation | null, yaw: 0 });
  /**
   * The pull-back out. Latched, because the page drops `pullOut` as soon as the
   * cross-fade ends - which is well before this move is over, and stopping it
   * there would strand the camera halfway down the dive.
   */
  const climb = useRef(0);
  const climbing = useRef(false);
  const announced = useRef(false);
  const { invalidate, gl, camera } = useThree();

  // The satellite land arrives after first paint; until then the globe shows
  // flat land rather than waiting on the download.
  const [imagery, setImagery] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImagery(img);
    img.src = EARTH_IMAGERY;
    return () => {
      img.onload = null;
    };
  }, []);

  const painted = useMemo(
    () =>
      createGlobeTexture({
        countries: GLOBE.countries,
        visitedIds,
        viewBox: GLOBE.viewBox,
        imagery,
      }),
    [visitedIds, imagery]
  );

  useEffect(() => () => painted?.dispose(), [painted]);

  // Hover is a repaint of the texture, not state on the mesh: putting it in
  // the scene graph would re-render the canvas on every pointer move.
  useEffect(() => {
    painted?.setHovered(hoveredId);
    invalidate();
  }, [painted, hoveredId, invalidate]);

  // The spin has to start from wherever the globe is at the moment of the
  // click, so it is captured here rather than read each frame - reading it per
  // frame is what made the old exponential lerp never quite arrive.
  useEffect(() => {
    if (!target) return;
    dive.current = {
      progress: 0,
      from: { ...rotation.current },
      yaw: nearestYaw(rotation.current.yaw, target.yaw),
    };
  }, [target, rotation]);

  useEffect(() => {
    if (!pullOut) return;
    climb.current = 0;
    climbing.current = true;
  }, [pullOut]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // One timeline for the whole move: the turn and the approach share a
    // progress and an easing, so the country arrives facing us at the same
    // instant the dive lands, instead of the two cancelling into a push-in.
    if (target && dive.current.from) {
      const seconds = DIVE_MS / 1000;
      if (dive.current.progress < 1) {
        dive.current.progress = Math.min(1, dive.current.progress + delta / seconds);
        const p = dive.current.progress;
        const turn = ease(p);
        const from = dive.current.from;
        rotation.current.yaw = from.yaw + (dive.current.yaw - from.yaw) * turn;
        rotation.current.pitch = from.pitch + (target.pitch - from.pitch) * turn;
        zoom.current = 1 + (ZOOM_TO - 1) * dip(p);
      } else {
        // Out of clock but not out of move: keep closing at the speed the dive
        // ended on, so a stage that is still loading costs a longer approach
        // rather than a frozen frame.
        zoom.current = Math.max(
          ZOOM_FLOOR,
          zoom.current + ((ZOOM_TO - 1) * DIP_END_SLOPE * delta) / seconds
        );
      }
      camera.position.z = distance.current * zoom.current;
      invalidate();
    }

    // The return: the globe is handed back mid-dive and climbs out of it.
    if (climbing.current && climb.current < 1) {
      climb.current = Math.min(1, climb.current + delta / (PULL_OUT_MS / 1000));
      // Eased out, not smoothstepped: the country's climb hands this the move
      // already at speed, and picking it up from a standstill is a pause.
      zoom.current = ZOOM_TO + (1 - ZOOM_TO) * easeOut(climb.current);
      camera.position.z = distance.current * zoom.current;
      invalidate();
    }

    // Order matters: `facingRotation` is solved for three's default XYZ, i.e.
    // Rx * Ry. Changing this silently breaks the spin-to-face.
    mesh.rotation.order = 'XYZ';
    mesh.rotation.y = rotation.current.yaw;
    mesh.rotation.x = rotation.current.pitch;

    // After the first real frame, so "ready" means drawn rather than mounted.
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
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
      {/* Children of the mesh, so they turn with it. Hidden for the dive. */}
      {!target &&
        [...visitedIds].map((id) => (
          <CountryLabel key={id} id={id} named={alwaysLabel || id === hoveredId} hovered={id === hoveredId} />
        ))}
    </mesh>
  );
}

/**
 * A draggable earth. It never moves on its own, so the render loop runs on
 * demand: nothing is drawn between a drag, a hover repaint and a selection
 * spin, which is what keeps an idle globe free on a phone battery.
 *
 * The fade between this and the country stage belongs to the page, which owns
 * both canvases and overlaps them; this one only reports that the dive is under
 * way and that it has drawn.
 */
export default function GlobeScene(props: GlobeSceneProps) {
  const { resumeId = null, diveId = null } = props;
  const target = useMemo(() => (diveId ? facingCountry(diveId) : null), [diveId]);
  const distance = useRef(1);
  // Resumed globes open mid-dive, at the exact framing the stage left off at.
  const zoom = useRef(resumeId ? ZOOM_TO : 1);
  const rotation = useRef<GlobeRotation>(
    (resumeId ? facingCountry(resumeId) : null) ?? openingRotation(props.visitedIds)
  );
  const drag = useRef<DragState>({ active: false, x: 0, y: 0, travel: 0 });
  const invalidateRef = useRef<() => void>(() => {});

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
      style={{ background: 'transparent', cursor: 'grab', touchAction: 'pan-y' }}
      onCreated={({ invalidate }) => {
        invalidateRef.current = invalidate;
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <FitCamera distanceRef={distance} zoomRef={zoom} />
      <SceneEnvironment />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 2, 4]} intensity={1.15} />
      <Earth
        {...props}
        rotation={rotation}
        drag={drag}
        distance={distance}
        zoom={zoom}
        target={target}
      />
    </Canvas>
  );
}
