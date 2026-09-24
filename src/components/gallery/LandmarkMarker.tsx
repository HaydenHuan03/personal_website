import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import LandmarkCanvas from './LandmarkCanvas';
import { WORLD_MAP } from './WorldMap';

export interface LandmarkMarkerProps {
  country: GalleryCountry;
  svgRef: RefObject<SVGSVGElement | null>;
}

export default function LandmarkMarker({ country, svgRef }: LandmarkMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const svg = svgRef.current;
    const entry = WORLD_MAP.countries.find((c) => c.id === country.id);
    if (!marker || !svg || !entry) return;

    const [cx, cy] = entry.centroid;
    let frame = 0;
    const place = () => {
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
        const ax = cx;
        const ay = cy;
        if (vw > 0 && vh > 0) {
          marker.style.left = `${((ax - vx) / vw) * 100}%`;
          marker.style.top = `${((ay - vy) / vh) * 100}%`;
          marker.style.transform = 'translate(-50%, -100%)';
          marker.style.visibility = 'visible';
        }
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [country.id, svgRef]);

  return (
    <div
      ref={markerRef}
      style={{ visibility: 'hidden' }}
      className="pointer-events-none absolute z-20 flex flex-col items-center animate-[fadeInUp_0.25s_ease-out]"
    >
      <LandmarkCanvas model={country.landmark.model} size="marker" />
      {/* Absolute so the label never adds height to the stack: the canvas's
          bottom edge is the anchor, which is what puts the building's base on
          the country rather than a couple of text-lines above it. It sits
          beside the base so it never overlaps the country underneath. */}
      <div className="absolute bottom-1 left-full ml-1 whitespace-nowrap text-left">
        <p className="font-heading text-sm font-semibold leading-tight text-stone-900 dark:text-stone-50">
          {country.name}
        </p>
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          {country.landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
        </p>
      </div>
    </div>
  );
}
