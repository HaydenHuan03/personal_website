import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import { WORLD_MAP } from '../components/gallery/WorldMap';
import { zoomViewBoxFor } from '../utils/gallery';

/** How far the map lies back when a country is opened, in degrees. */
export const MAP_TILT = 58;

interface MapStage {
  svgRef: RefObject<SVGSVGElement | null>;
  planeRef: RefObject<HTMLDivElement | null>;
  /** Live tilt in degrees, for markers that must stay upright on the plane. */
  tiltRef: RefObject<number>;
}

/**
 * Drives the map's "lie down and zoom in" animation.
 *
 * Both the viewBox zoom and the plane's tilt run off one tween so they stay in
 * lockstep, and the current tilt is published through `tiltRef` so anything
 * standing on the map can counter-rotate by exactly the same amount.
 */
export function useMapStage(selectedId: string | null, reducedMotion: boolean): MapStage {
  const svgRef = useRef<SVGSVGElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    const plane = planeRef.current;
    if (!svg || !plane) return;

    const base = WORLD_MAP.viewBox;
    const entry = selectedId
      ? WORLD_MAP.countries.find((c) => c.id === selectedId)
      : undefined;
    const targetBox = entry ? zoomViewBoxFor(entry.bbox, base) : base;
    const targetTilt = selectedId ? MAP_TILT : 0;
    const duration = reducedMotion ? 0 : 1.1;

    const state = { tilt: tiltRef.current };
    const tl = gsap.timeline({ defaults: { duration, ease: 'power2.inOut' } });
    tl.to(svg, { attr: { viewBox: targetBox.join(' ') }, overwrite: 'auto' }, 0);
    tl.to(
      state,
      {
        tilt: targetTilt,
        overwrite: 'auto',
        onUpdate: () => {
          tiltRef.current = state.tilt;
          plane.style.transform = `rotateX(${state.tilt}deg)`;
        },
      },
      0
    );

    return () => {
      tl.kill();
    };
  }, [selectedId, reducedMotion]);

  return { svgRef, planeRef, tiltRef };
}
