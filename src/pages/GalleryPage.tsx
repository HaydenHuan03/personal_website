import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackLink from '../components/BackLink';
import WorldMap, { WORLD_MAP } from '../components/gallery/WorldMap';
import LandmarkMarker from '../components/gallery/LandmarkMarker';
import CountryHeading from '../components/gallery/CountryHeading';
import CountryStage from '../components/gallery/CountryStage';
import Globe from '../components/gallery/Globe';
import { preloadLandmark } from '../components/gallery/LandmarkCanvas';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { GALLERY } from '../data/gallery';
import { findCountry, unionBbox } from '../utils/gallery';

const VISITED_IDS: ReadonlySet<string> = new Set(GALLERY.countries.map((c) => c.id));

/** The page's text measure, applied per block since `main` itself is full width. */
const COLUMN = 'max-w-6xl mx-auto px-6 md:px-12';

/** The globe's box. Square-ish at every width, which a flat map cannot be. */
const GLOBE_BOX = 'w-full h-[min(72vh,46rem)]';

/** Portrait-ish, so the map is worth looking at on a phone. */
const NARROW_ASPECT = 0.78;

/** Bounds of everywhere that has been visited, in the map's own coordinates. */
const VISITED_BOUNDS = unionBbox(
  WORLD_MAP.countries.filter((c) => VISITED_IDS.has(c.id)).map((c) => c.bbox)
);

/**
 * Aspect of the map's frame on a narrow screen, and where it starts.
 *
 * Only the aspect is CSS: the svg is sized by its height, so the frame shows
 * the whole map top to bottom and the rest of the world is a sideways scroll
 * away. The starting scroll position is the one thing JS has to do, since CSS
 * cannot set it - but it only moves the scroll offset, never the layout, so
 * nothing reflows after hydration.
 */
const NARROW_STYLE = { '--map-aspect': String(NARROW_ASPECT) } as CSSProperties;

/** Horizontal centre of the visited region, as a fraction of the map's width. */
const VISITED_CENTRE = VISITED_BOUNDS
  ? (VISITED_BOUNDS[0] + VISITED_BOUNDS[2]) / 2 / WORLD_MAP.viewBox[2]
  : 0.5;

export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = findCountry(GALLERY, searchParams.get('country')) ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverCapable = useHoverCapable();
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

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

  // Start the map on the visited region rather than at the anti-meridian.
  // Only runs where the frame actually scrolls, which is the narrow layout, so
  // this needs no media query of its own. An effect rather than a layout
  // effect: React warns about the latter during SSR, and this moves only the
  // scroll offset, never the layout.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || selected) return;
    const overflow = frame.scrollWidth - frame.clientWidth;
    if (overflow <= 0) return;
    const target = VISITED_CENTRE * frame.scrollWidth - frame.clientWidth / 2;
    frame.scrollLeft = Math.min(Math.max(target, 0), overflow);
  }, [selected]);

  const hovered = useMemo(() => findCountry(GALLERY, hoveredId) ?? null, [hoveredId]);

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

  useEffect(() => {
    if (hovered) preloadLandmark(hovered.landmark.model);
  }, [hovered]);

  return (
    <>
      <Navbar />
      {selected && <BackLink onClick={back}>Back to map</BackLink>}
      {/* Full width, so the world map can run edge to edge; everything that
          is text gets its own centred column instead. */}
      <main id="main-content" className={`pb-24 ${selected ? '' : 'pt-12 md:pt-20'}`}>
        {!selected && (
          <header className={`${COLUMN} mb-10 text-center animate-[fadeInUp_0.5s_ease-out]`}>
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-4 leading-[1.1] text-balance">
              Gallery
            </h1>
            <p className="text-stone-600 max-w-xl mx-auto">
              This page will show the places I have been.
            </p>
          </header>
        )}

        {!selected && GALLERY.countries.length === 0 && (
          <p className={`${COLUMN} text-sm text-stone-500 mb-6`}>Nothing here yet.</p>
        )}

        {/* Selecting a country hands the globe off to the stage: the globe
            spins it round, dives towards it and fades, and only then does the
            country lie down with its landmark standing on it. */}
        {selected && selectedShape ? (
          <div className={COLUMN}>
            <CountryHeading key={`${selected.id}-heading`} country={selected} />
            <CountryStage
              key={selected.id}
              d={selectedShape.d}
              centroid={selectedShape.centroid}
              model={selected.landmark.model}
              className="mt-4"
            />
            {/* The model is CC BY, so this line has to stay on the page. */}
            <p className="mt-6 text-center text-xs text-stone-500">
              Model: &ldquo;{selected.landmark.name}&rdquo; by{' '}
              {selected.landmark.attribution.author},{' '}
              <a
                href={selected.landmark.attribution.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:text-stone-900"
              >
                {selected.landmark.attribution.license}{' '}
                <ExternalLink size={10} aria-hidden="true" />
              </a>
            </p>
          </div>
        ) : (
          // A draggable globe, falling back to the flat map: on the server,
          // while its chunk loads, and wherever WebGL is unavailable. The flat
          // map is the reason this page still works with JS off, so it stays.
          <Globe
            visitedIds={VISITED_IDS}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={select}
            className={GLOBE_BOX}
            fallback={
              <div ref={frameRef} className="relative map-frame" style={NARROW_STYLE}>
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
            }
          />
        )}

      </main>
      <Footer />
    </>
  );
}
