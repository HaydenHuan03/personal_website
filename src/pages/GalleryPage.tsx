import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WorldMap, { WORLD_MAP } from '../components/gallery/WorldMap';
import LandmarkMarker from '../components/gallery/LandmarkMarker';
import CountryGallery from '../components/gallery/CountryGallery';
import CountryStage from '../components/gallery/CountryStage';
import { preloadLandmark } from '../components/gallery/LandmarkCanvas';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { GALLERY } from '../data/gallery';
import { findCountry } from '../utils/gallery';

const VISITED_IDS: ReadonlySet<string> = new Set(GALLERY.countries.map((c) => c.id));

export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = findCountry(GALLERY, searchParams.get('country')) ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverCapable = useHoverCapable();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    document.title = 'Gallery - Hayden Huan';
    return () => {
      document.title = 'Hayden Huan - Backend Engineer & Infrastructure Developer';
    };
  }, []);

  const select = useCallback(
    (id: string) => {
      setHoveredId(null);
      setSearchParams({ country: id });
    },
    [setSearchParams]
  );

  const back = useCallback(() => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  const hovered = useMemo(() => findCountry(GALLERY, hoveredId) ?? null, [hoveredId]);

  useEffect(() => {
    if (hovered) preloadLandmark(hovered.landmark.model);
  }, [hovered]);

  const selectedShape = useMemo(() => {
    if (!selected) return null;
    const entry = WORLD_MAP.countries.find((c) => c.id === selected.id);
    if (!entry) return null;
    // The finer outline is what makes the country readable at slab scale.
    const detailed = entry.detailD !== undefined;
    return {
      d: detailed ? entry.detailD! : entry.d,
      centroid: (detailed ? (entry.detailCentroid ?? entry.centroid) : entry.centroid) as [
        number,
        number,
      ],
    };
  }, [selected]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-6xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
        <Link
          to="/"
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-12 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Previous Page
        </Link>

        <header className="mb-10 animate-[fadeInUp_0.5s_ease-out]">
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-4 leading-[1.1] text-balance">
            Gallery
          </h1>
          <p className="text-stone-600 max-w-xl">
            Places I have been. Hover a highlighted country to see its landmark, click to open the
            photos.
          </p>
        </header>

        {GALLERY.countries.length === 0 && (
          <p className="text-sm text-stone-500 mb-6">Nothing here yet.</p>
        )}

        {/* Selecting a country swaps the flat map for a 3D scene where the
            country lies on the ground plane and its landmark stands up off it
            at a true right angle - a CSS-tilted map with a billboard in front
            of it only ever fakes that relationship. */}
        {selected && selectedShape ? (
          <CountryStage
            key={selected.id}
            d={selectedShape.d}
            centroid={selectedShape.centroid}
            model={selected.landmark.model}
            className="animate-[fadeInUp_0.5s_ease-out]"
          />
        ) : (
          <div className="relative">
            <WorldMap
              ref={svgRef}
              visitedIds={VISITED_IDS}
              selectedId={null}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onSelect={select}
            />
            {hovered && hoverCapable && (
              <LandmarkMarker key={hovered.id} country={hovered} svgRef={svgRef} />
            )}
          </div>
        )}

        {selected && <CountryGallery key={selected.id} country={selected} onBack={back} />}
      </main>
      <Footer />
    </>
  );
}
