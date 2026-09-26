import type { GalleryCountry } from '@/types/gallery';
import { formatVisitedAt } from '@/lib/gallery';
import LandmarkCanvas from './LandmarkCanvas';
import { WORLD_MAP } from '@/components/gallery/globe/WorldMap';

export interface LandmarkMarkerProps {
  country: GalleryCountry;
}

export default function LandmarkMarker({ country }: LandmarkMarkerProps) {
  const entry = WORLD_MAP.countries.find((c) => c.id === country.id);
  if (!entry) return null;
  const [vx, vy, vw, vh] = WORLD_MAP.viewBox;
  const [cx, cy] = entry.centroid;

  return (
    <div
      style={{
        left: `${((cx - vx) / vw) * 100}%`,
        top: `${((cy - vy) / vh) * 100}%`,
        transform: 'translate(-50%, -100%)',
      }}
      className="pointer-events-none absolute z-20 flex flex-col items-center animate-[fadeInUp_0.25s_ease-out]"
    >
      <LandmarkCanvas model={country.landmark.model} />
      {/* Absolute, so the label adds no height and the building's base stays on the country. */}
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
