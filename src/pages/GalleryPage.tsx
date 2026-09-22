import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WorldMap from '../components/gallery/WorldMap';
import LandmarkMarker from '../components/gallery/LandmarkMarker';
import CountryGallery from '../components/gallery/CountryGallery';
import { preloadLandmark } from '../components/gallery/LandmarkCanvas';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMapStage } from '../hooks/useMapStage';
import { GALLERY } from '../data/gallery';
import { findCountry } from '../utils/gallery';

const VISITED_IDS: ReadonlySet<string> = new Set(GALLERY.countries.map((c) => c.id));

export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = findCountry(GALLERY, searchParams.get('country')) ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverCapable = useHoverCapable();
  const reducedMotion = useReducedMotion();
  const { svgRef, planeRef, tiltRef } = useMapStage(selected?.id ?? null, reducedMotion);

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
  // The landmark stands on the country being hovered, and stays standing on
  // the selected one while the map lies down and zooms into it.
  const marked = selected ?? hovered;

  useEffect(() => {
    if (marked) preloadLandmark(marked.landmark.model);
  }, [marked]);

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

        {/* The stage gives the map plane its vanishing point; the plane is what
            lies down on select, carrying the landmark standing on it. */}
        <div style={{ perspective: '1400px', perspectiveOrigin: '50% 35%' }}>
          <div
            ref={planeRef}
            className="relative origin-top"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <WorldMap
              ref={svgRef}
              visitedIds={VISITED_IDS}
              selectedId={selected?.id ?? null}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onSelect={select}
              dimmed={selected !== null}
            />
            {marked && (hoverCapable || selected) && (
              <LandmarkMarker key={marked.id} country={marked} svgRef={svgRef} tiltRef={tiltRef} />
            )}
          </div>
        </div>

        {selected && <CountryGallery key={selected.id} country={selected} onBack={back} />}
      </main>
      <Footer />
    </>
  );
}
