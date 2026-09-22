import { useLayoutEffect, useState } from 'react';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import LandmarkCanvas from './LandmarkCanvas';
import { WORLD_MAP } from './WorldMap';

export interface HoverCardProps {
  country: GalleryCountry;
  svg: SVGSVGElement;
  containerEl: HTMLElement;
}

const CARD_W = 240;
const GAP = 12;

/** Floating landmark preview anchored at the hovered country's centroid. */
export default function HoverCard({ country, svg, containerEl }: HoverCardProps) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const entry = WORLD_MAP.countries.find((c) => c.id === country.id);
    if (!entry) return;
    // Map the SVG-space centroid into the container's pixel space.
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const screen = new DOMPoint(entry.centroid[0], entry.centroid[1]).matrixTransform(ctm);
    const box = containerEl.getBoundingClientRect();
    const x = screen.x - box.left;
    const y = screen.y - box.top;
    // Prefer the right side; flip left if it would overflow the container.
    const left = x + GAP + CARD_W > box.width ? x - GAP - CARD_W : x + GAP;
    setPos({ left, top: Math.max(0, y - 140) });
  }, [country.id, svg, containerEl]);

  if (!pos) return null;

  return (
    <div
      role="tooltip"
      style={{ left: pos.left, top: pos.top, width: CARD_W }}
      className="pointer-events-none absolute z-20 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur animate-[fadeInUp_0.2s_ease-out]"
    >
      <LandmarkCanvas model={country.landmark.model} size="card" />
      <p className="mt-2 font-heading text-base font-semibold text-stone-900">{country.name}</p>
      <p className="text-xs text-stone-500">
        {country.landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
      </p>
    </div>
  );
}
