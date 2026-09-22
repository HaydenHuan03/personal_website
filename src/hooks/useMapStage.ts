import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import { WORLD_MAP } from '../components/gallery/WorldMap';

/** How far the map lies back when a country is opened, in degrees. */
export const MAP_TILT = 58;

/** Fraction of the viewBox height the isolated country is grown to fill. */
const ISOLATED_HEIGHT = 0.42;

interface MapStage {
  svgRef: RefObject<SVGSVGElement | null>;
  planeRef: RefObject<HTMLDivElement | null>;
  /** Live tilt in degrees, for markers that must stay upright on the plane. */
  tiltRef: RefObject<number>;
}

/**
 * Drives the map's "lie down and isolate" animation.
 *
 * Selecting a country lies the map plane back, fades every other country out,
 * and grows the selected one toward the middle of the map. The viewBox is
 * never touched, so the map itself does not zoom - only the country does.
 * Tilt is published through `tiltRef` so anything standing on the map can
 * counter-rotate by exactly the same amount.
 */
export function useMapStage(selectedId: string | null, reducedMotion: boolean): MapStage {
  const svgRef = useRef<SVGSVGElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    const plane = planeRef.current;
    if (!svg || !plane) return;

    const [, , vw, vh] = WORLD_MAP.viewBox;
    const entry = selectedId ? WORLD_MAP.countries.find((c) => c.id === selectedId) : undefined;
    const others = Array.from(
      svg.querySelectorAll<SVGElement>('[data-layer="rest"], [data-country]')
    ).filter((el) => el.getAttribute('data-country') !== selectedId);
    const target = selectedId
      ? svg.querySelector<SVGGElement>(`[data-country="${selectedId}"]`)
      : null;

    const duration = reducedMotion ? 0 : 1.1;
    const state = { tilt: tiltRef.current };
    const tl = gsap.timeline({ defaults: { duration, ease: 'power2.inOut', overwrite: 'auto' } });

    tl.to(
      state,
      {
        tilt: selectedId ? MAP_TILT : 0,
        onUpdate: () => {
          tiltRef.current = state.tilt;
          plane.style.transform = `rotateX(${state.tilt}deg)`;
        },
      },
      0
    );
    tl.to(others, { autoAlpha: selectedId ? 0 : 1, duration: duration * 0.6 }, 0);

    if (target && entry) {
      const [x0, y0, x1, y1] = entry.bbox;
      const [cx, cy] = entry.centroid;
      const scale = Math.min(
        (vh * ISOLATED_HEIGHT) / Math.max(y1 - y0, 0.01),
        (vw * 0.5) / Math.max(x1 - x0, 0.01)
      );
      // Written as an explicit transform string rather than GSAP's x/y/scale:
      // on an SVG group those compose so that the translation is multiplied by
      // the scale, which throws a 20x-enlarged country off the canvas.
      const progress = { p: 0 };
      tl.to(
        progress,
        {
          p: 1,
          onUpdate: () => {
            const t = progress.p;
            const s = 1 + (scale - 1) * t;
            const tx = cx + (vw / 2 - cx) * t;
            const ty = cy + (vh / 2 - cy) * t;
            target.setAttribute('transform', `translate(${tx} ${ty}) scale(${s}) translate(${-cx} ${-cy})`);
          },
        },
        0
      );
    } else {
      // Every visited country returns to its place on the world map.
      svg.querySelectorAll<SVGGElement>('[data-country]').forEach((el) => {
        const from = el.getAttribute('transform');
        if (!from) return;
        const progress = { p: 1 };
        tl.to(
          progress,
          {
            p: 0,
            onUpdate: () => {
              const id = el.getAttribute('data-country');
              const c = WORLD_MAP.countries.find((x) => x.id === id);
              if (!c) return;
              const [x0, y0, x1, y1] = c.bbox;
              const [cx, cy] = c.centroid;
              const scale = Math.min(
                (vh * ISOLATED_HEIGHT) / Math.max(y1 - y0, 0.01),
                (vw * 0.5) / Math.max(x1 - x0, 0.01)
              );
              const t = progress.p;
              const s = 1 + (scale - 1) * t;
              const tx = cx + (vw / 2 - cx) * t;
              const ty = cy + (vh / 2 - cy) * t;
              el.setAttribute('transform', `translate(${tx} ${ty}) scale(${s}) translate(${-cx} ${-cy})`);
            },
            onComplete: () => el.removeAttribute('transform'),
          },
          0
        );
      });
    }

    return () => {
      tl.kill();
    };
  }, [selectedId, reducedMotion]);

  return { svgRef, planeRef, tiltRef };
}
