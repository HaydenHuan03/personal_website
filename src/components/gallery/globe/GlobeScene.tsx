import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { ArrowRight } from 'lucide-react';
import { Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
import equirectJson from '@/data/world-equirect.json';
import type { WorldMapSnapshot } from '@/types/gallery';
import {
  facingRotation,
  pickVisited,
  sphereUv,
  texturePointOnSphere,
  uvToTexture,
  type GlobeRotation,
} from '@/lib/globe';
import { createGlobeTexture } from './globeTexture';
import '@/components/gallery/quietThree';
import SceneEnvironment from '@/components/gallery/SceneEnvironment';
import { DIVE_MS, easeOut, PULL_OUT_MS, ZOOM_FLOOR, ZOOM_TO } from '@/components/gallery/transition';

/** Country outlines for the globe. Imported here so they load with the globe, not the page. */
const GLOBE = equirectJson as unknown as WorldMapSnapshot;

/** NASA Blue Marble satellite image, 2048x1024, wrapped round the sphere. */
const EARTH_IMAGERY = '/gallery/earth.webp';

const RADIUS = 1;
/** How far the pointer may travel during a press and still count as a click. */
const CLICK_SLOP = 6;
/** Radians of rotation per pixel dragged. */
const DRAG_SPEED = 0.006;
/** Stop short of the poles, so the globe cannot be tumbled upside down. */
const MAX_PITCH = 1.1;
/** Extra space around the globe, so it stays clear of the page heading. */
const FIT_MARGIN = 1.5;
/** A label hides when its country faces the camera less than this (a cosine). */
const LABEL_MIN_FACING = 0.2;
const labelWorld = new Vector3();
const labelView = new Vector3();

export interface GlobeSceneProps {
  visitedIds: ReadonlySet<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Open already zoomed in on this country, so coming back from it is one smooth move. */
  resumeId?: string | null;
  /** Zoom back out from `resumeId`. */
  pullOut?: boolean;
  /** Label every visited country, not just the hovered one (touch screens have no hover). */
  alwaysLabel?: boolean;
  /** Spin to this country and zoom in. Set by the page, so keyboard selection moves the same way as a click. */
  diveId?: string | null;
  /** Called after the globe draws its first frame. */
  onReady?: () => void;
}

/** Smoothstep easing for the spin, so it slows to a stop. */
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Easing for the zoom in, and its speed at the end. It is still speeding up
 * when it ends, because the country scene takes over and carries the motion on.
 */
const dip = (t: number) => 0.35 * t + 0.65 * t * t;
const DIP_END_SLOPE = 0.35 + 2 * 0.65;

/** Yaw and pitch that bring a texture-space point round to face the camera. */
function facing(x: number, y: number): GlobeRotation {
  return facingRotation(texturePointOnSphere({ x, y }, GLOBE.viewBox));
}

/** The country's facing rotation, by id. */
function facingCountry(id: string): GlobeRotation | null {
  const country = GLOBE.countries.find((c) => c.id === id);
  return country ? facing(country.centroid[0], country.centroid[1]) : null;
}

/** The angle equal to `to` that is closest to `from`, so the spin takes the short way round. */
function nearestYaw(from: number, to: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Start facing the middle of the visited countries. */
function openingRotation(visitedIds: ReadonlySet<string>): GlobeRotation {
  const visited = GLOBE.countries.filter((c) => visitedIds.has(c.id));
  if (!visited.length) return { yaw: 0, pitch: 0 };
  const x = visited.reduce((sum, c) => sum + c.centroid[0], 0) / visited.length;
  const y = visited.reduce((sum, c) => sum + c.centroid[1], 0) / visited.length;
  return facing(x, y);
}

/** Moves the camera back until the whole globe fits the canvas, width and height, on every resize. */
function FitCamera({
  distanceRef,
  zoomRef,
}: {
  distanceRef: React.RefObject<number>;
  /** Current zoom, as a fraction of the fitted distance. */
  zoomRef: React.RefObject<number>;
}) {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const view = camera as PerspectiveCamera;
    const vertical = (view.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * view.aspect);
    const distance =
      Math.max(RADIUS / Math.tan(vertical / 2), RADIUS / Math.tan(horizontal / 2)) * FIT_MARGIN;
    // Saved so the zoom can scale it.
    distanceRef.current = distance;
    // Keep the current zoom through a resize.
    view.position.set(0, 0, distance * zoomRef.current);
    view.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate, distanceRef, zoomRef]);

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
  /** The fitted camera distance; `zoom` scales it. */
  distance: React.RefObject<number>;
  /** Current zoom, as a fraction of that distance. */
  zoom: React.RefObject<number>;
  /** Rotation to spin to, or null while the user is in control. */
  target: GlobeRotation | null;
}

/** A pulsing dot on a visited country, plus its name when `named`. Hides when the country turns away. */
function CountryLabel({ id, named, hovered }: { id: string; named: boolean; hovered: boolean }) {
  const country = GLOBE.countries.find((c) => c.id === id);
  const groupRef = useRef<Group>(null);
  // Kept in state: Html renders in its own root, which may not exist yet when this frame runs.
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
  /** Zoom-in progress and the rotation it started from. */
  const dive = useRef({ progress: 0, from: null as GlobeRotation | null, yaw: 0 });
  /** Zoom-out progress. It runs to 1 even after the page turns `pullOut` off. */
  const climb = useRef(1);
  const announced = useRef(false);
  const { invalidate, gl, camera } = useThree();

  // Draw flat colours first, then switch to the satellite image once it loads.
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

  // Hover repaints the texture instead of changing the scene.
  useEffect(() => {
    painted?.setHovered(hoveredId);
    invalidate();
  }, [painted, hoveredId, invalidate]);

  // Remember where the spin starts, at the moment a target is set.
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
  }, [pullOut]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // The spin and the zoom share one progress value, so they finish together.
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
        // Time is up but the country scene isn't ready yet: keep zooming at the
        // same speed, down to ZOOM_FLOOR.
        zoom.current = Math.max(
          ZOOM_FLOOR,
          zoom.current + ((ZOOM_TO - 1) * DIP_END_SLOPE * delta) / seconds
        );
      }
      camera.position.z = distance.current * zoom.current;
      invalidate();
    }

    // Coming back from a country: zoom out.
    if (climb.current < 1) {
      climb.current = Math.min(1, climb.current + delta / (PULL_OUT_MS / 1000));
      // Starts fast, continuing the country scene's own zoom out.
      zoom.current = ZOOM_TO + (1 - ZOOM_TO) * easeOut(climb.current);
      camera.position.z = distance.current * zoom.current;
      invalidate();
    }

    // Must stay XYZ: facingRotation assumes this order.
    mesh.rotation.order = 'XYZ';
    mesh.rotation.y = rotation.current.yaw;
    mesh.rotation.x = rotation.current.pitch;

    // Report ready once the first frame is drawn.
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }
  });

  /** The visited country under the pointer, found from where the ray hits the texture. */
  const pick = (event: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const mesh = meshRef.current;
    if (!mesh) return null;
    const local = mesh.worldToLocal(event.point.clone());
    const [u, v] = sphereUv(local, RADIUS);
    return pickVisited(uvToTexture(u, v, GLOBE.viewBox), GLOBE.countries, visitedIds);
  };

  return (
    <mesh
      ref={meshRef}
      // Hover and click need the hit point, so they live on the mesh.
      // Dragging lives on the canvas so it keeps working past the globe's edge.
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
        // A press that dragged the globe is not a click.
        if (target || drag.current.travel > CLICK_SLOP) return;
        const id = pick(event);
        if (id) onSelect(id);
      }}
    >
      <sphereGeometry args={[RADIUS, 96, 64]} />
      <meshStandardMaterial map={painted?.texture ?? null} roughness={0.85} metalness={0.05} />
      {/* Inside the mesh so they turn with it. Hidden during the dive. */}
      {!target &&
        [...visitedIds].map((id) => (
          <CountryLabel key={id} id={id} named={alwaysLabel || id === hoveredId} hovered={id === hoveredId} />
        ))}
    </mesh>
  );
}

/**
 * A draggable globe. It only redraws when something changes (a drag, hover or
 * spin), which saves battery. The page fades between this and the country scene.
 */
export default function GlobeScene(props: GlobeSceneProps) {
  const { resumeId = null, diveId = null } = props;
  const target = useMemo(() => (diveId ? facingCountry(diveId) : null), [diveId]);
  const distance = useRef(1);
  // Coming back from a country: start zoomed in on it.
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
    // Keep `travel`: the click handler runs after this and reads it.
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
