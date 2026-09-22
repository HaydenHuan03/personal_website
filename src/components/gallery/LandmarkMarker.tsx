import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import LandmarkCanvas from './LandmarkCanvas';
import { WORLD_MAP } from './WorldMap';

export interface LandmarkMarkerProps {
  country: GalleryCountry;
  svgRef: RefObject<SVGSVGElement | null>;
  tiltRef: RefObject<number>;
}

export default function LandmarkMarker({ country, svgRef, tiltRef }: LandmarkMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const svg = svgRef.current;
    const entry = WORLD_MAP.countries.find((c) => c.id === country.id);
    if (!marker || !svg || !entry) return;

    const [cx, cy] = entry.centroid;
    const group = svg.querySelector<SVGGElement>(`[data-country="${country.id}"]`);
    let frame = 0;
    const place = () => {
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);
        // While a country is isolated it is translated toward the middle of the
        // map; its transform's translate is exactly where its centroid lands,
        // so read it rather than duplicating the animation's maths here.
        const moved = group?.getAttribute('transform');
        const match = moved ? /translate\((-?[\d.]+)[\s,]+(-?[\d.]+)\)/.exec(moved) : null;
        const ax = match ? Number(match[1]) : cx;
        const ay = match ? Number(match[2]) : cy;
        if (vw > 0 && vh > 0) {
          marker.style.left = `${((ax - vx) / vw) * 100}%`;
          marker.style.top = `${((ay - vy) / vh) * 100}%`;
          marker.style.transform = `translate(-50%, -100%) rotateX(${-tiltRef.current}deg)`;
          marker.style.visibility = 'visible';
        }
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [country.id, svgRef, tiltRef]);

  return (
    <div
      ref={markerRef}
      style={{ visibility: 'hidden', transformOrigin: 'bottom center' }}
      className="pointer-events-none absolute z-20 flex flex-col items-center animate-[fadeInUp_0.25s_ease-out]"
    >
      <LandmarkCanvas model={country.landmark.model} size="marker" />
      {/* Absolute so the label never adds height to the stack: the canvas's
          bottom edge is the anchor, which is what puts the building's base on
          the country rather than a couple of text-lines above it. It sits
          beside the base and slightly proud of the map, because anything below
          the base is behind the (tilted) map plane and gets occluded by it. */}
      <div
        style={{ transform: 'translateZ(4px)' }}
        className="absolute bottom-1 left-full ml-1 whitespace-nowrap text-left"
      >
        <p className="font-heading text-sm font-semibold leading-tight text-stone-900">
          {country.name}
        </p>
        <p className="text-[11px] text-stone-500">
          {country.landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
        </p>
      </div>
    </div>
  );
}
