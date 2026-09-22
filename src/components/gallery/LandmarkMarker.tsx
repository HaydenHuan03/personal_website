import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import LandmarkCanvas from './LandmarkCanvas';
import { WORLD_MAP } from './WorldMap';

export interface LandmarkMarkerProps {
  country: GalleryCountry;
  svgRef: RefObject<SVGSVGElement | null>;
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * The country's landmark rendered in place on the map: the model's base sits
 * on the country's centroid so the building appears to stand on it, with the
 * country name pinned at that point.
 *
 * Position is written straight to the DOM node on each frame rather than held
 * in state - the map's viewBox is tweened by GSAP, so this has to re-anchor
 * every frame, and re-rendering the WebGL canvas that often would stall it.
 */
export default function LandmarkMarker({ country, svgRef, containerRef }: LandmarkMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const svg = svgRef.current;
    const container = containerRef.current;
    const entry = WORLD_MAP.countries.find((c) => c.id === country.id);
    if (!marker || !svg || !container || !entry) return;

    const point = new DOMPoint(entry.centroid[0], entry.centroid[1]);
    let frame = 0;
    const place = () => {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const screen = point.matrixTransform(ctm);
        const box = container.getBoundingClientRect();
        marker.style.left = `${screen.x - box.left}px`;
        marker.style.top = `${screen.y - box.top}px`;
        marker.style.visibility = 'visible';
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [country.id, svgRef, containerRef]);

  return (
    <div
      ref={markerRef}
      style={{ visibility: 'hidden' }}
      className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center animate-[fadeInUp_0.25s_ease-out]"
    >
      <LandmarkCanvas model={country.landmark.model} size="marker" />
      <p className="font-heading text-sm font-semibold leading-tight text-stone-900">
        {country.name}
      </p>
      <p className="text-[11px] text-stone-500">
        {country.landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
      </p>
    </div>
  );
}
