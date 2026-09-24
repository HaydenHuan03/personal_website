import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WorldMap, { WORLD_MAP } from '../components/gallery/WorldMap';
import LandmarkMarker from '../components/gallery/LandmarkMarker';
import CountryHeading from '../components/gallery/CountryHeading';
import CountryStage, { preloadCountryScene } from '../components/gallery/CountryStage';
import Globe from '../components/gallery/Globe';
import { preloadLandmark } from '../components/gallery/LandmarkCanvas';
import { CLIMB_MS, CROSSFADE_MS, DIVE_MS, READY_CAP_MS } from '../components/gallery/transition';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { GALLERY } from '../data/gallery';
import { findCountry, unionBbox } from '../utils/gallery';

const VISITED_IDS: ReadonlySet<string> = new Set(GALLERY.countries.map((c) => c.id));

const COLUMN = 'max-w-6xl mx-auto px-6 md:px-12';

// Short enough to sit under the header without scrolling, and on a phone no
// taller than the globe, which is sized by the width.
const SCENE_BOX = 'relative w-full h-[max(20rem,min(72vh,46rem,calc(100svh-20rem),100vw))]';

const NARROW_ASPECT = 0.78;

const VISITED_BOUNDS = unionBbox(
  WORLD_MAP.countries.filter((c) => VISITED_IDS.has(c.id)).map((c) => c.bbox)
);

const NARROW_STYLE = { '--map-aspect': String(NARROW_ASPECT) } as CSSProperties;

const VISITED_CENTRE = VISITED_BOUNDS
  ? (VISITED_BOUNDS[0] + VISITED_BOUNDS[2]) / 2 / WORLD_MAP.viewBox[2]
  : 0.5;

type Phase = 'map' | 'toCountry' | 'country' | 'toMap';

const fade = (visible: boolean) =>
  `transition-opacity ease-out ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`;

const FADE_STYLE: CSSProperties = { transitionDuration: `${CROSSFADE_MS}ms` };

export default function GalleryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = findCountry(GALLERY, searchParams.get('country')) ?? null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(() => (selected ? 'country' : 'map'));
  const [crossfade, setCrossfade] = useState(false);
  // The country stage, built and drawn once while the map is idle and then
  // kept: creating its WebGL context, compiling shaders and building the slab
  // inside the tap is what stuttered the dive on phones.
  const [stageWarm, setStageWarm] = useState(false);
  const hoverCapable = useHoverCapable();
  const reducedMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const incomingReady = useRef(false);

  // The URL is the source of truth for which country is open, so browser
  // Back/Forward moves the view with it. setSearchParams lands a render or so
  // after it is called, so a transition in flight is left alone: a dive that
  // has not seen its ?country yet is not a closed country. Only the settled
  // views are corrected, and the end of the climb out waits here for the URL
  // to clear rather than flipping to the map ahead of it.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    const settled = selectedId
      ? phase === 'map' && 'country'
      : (phase === 'country' || phase === 'toMap') && 'map';
    if (!settled) return;
    setCrossfade(false);
    setPhase(settled);
  }, [selectedId, phase]);

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
      // Reduced motion has no move to make: the URL change opens it directly.
      if (reducedMotion) return;

      incomingReady.current = false;
      setCrossfade(false);
      setPhase('toCountry');
    },
    [setSearchParams, reducedMotion]
  );

  const back = useCallback(() => {
    if (reducedMotion) {
      setSearchParams({});
      return;
    }
    incomingReady.current = false;
    setCrossfade(false);
    setPhase('toMap');
  }, [reducedMotion, setSearchParams]);

  useEffect(() => {
    if (phase !== 'toCountry' && phase !== 'toMap') return;
    const move = phase === 'toCountry' ? DIVE_MS : CLIMB_MS;
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= move && (incomingReady.current || elapsed >= move + READY_CAP_MS)) {
        setCrossfade(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (!crossfade) return;
    const done = window.setTimeout(() => {
      if (phase === 'toCountry') {
        setCrossfade(false);
        setPhase('country');
      } else if (phase === 'toMap') {
        setSearchParams({});
      }
    }, CROSSFADE_MS);
    return () => window.clearTimeout(done);
  }, [crossfade, phase, setSearchParams]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || phase !== 'map') return;
    const overflow = frame.scrollWidth - frame.clientWidth;
    if (overflow <= 0) return;
    const target = VISITED_CENTRE * frame.scrollWidth - frame.clientWidth / 2;
    frame.scrollLeft = Math.min(Math.max(target, 0), overflow);
  }, [phase]);

  const hovered = useMemo(() => findCountry(GALLERY, hoveredId) ?? null, [hoveredId]);

  const stageCountry = selected ?? (stageWarm ? (GALLERY.countries[0] ?? null) : null);

  const stageShape = useMemo(() => {
    if (!stageCountry) return null;
    const entry = WORLD_MAP.countries.find((c) => c.id === stageCountry.id);
    if (!entry) return null;
    const detailed = entry.detailD !== undefined;
    return {
      d: detailed ? entry.detailD! : entry.d,
      centroid: (detailed ? (entry.detailCentroid ?? entry.centroid) : entry.centroid) as [
        number,
        number,
      ],
    };
  }, [stageCountry]);

  useEffect(() => {
    if (!hovered) return;
    preloadLandmark(hovered.landmark.model);
    preloadCountryScene();
  }, [hovered]);


  useEffect(() => {
    if (phase !== 'map') return;
    const warm = () => setStageWarm(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, [phase]);

  const globeVisible =
    phase === 'map' || (phase === 'toCountry' && !crossfade) || (phase === 'toMap' && crossfade);
  const countryVisible =
    phase === 'country' || (phase === 'toCountry' && crossfade) || (phase === 'toMap' && !crossfade);
  const globeMounted = phase !== 'country';
  const countryMounted = (phase !== 'map' || stageWarm) && Boolean(stageCountry && stageShape);

  const onIncomingReady = useCallback(() => {
    incomingReady.current = true;
  }, []);

  return (
    <>
      <Navbar />
      <main id="main-content" className="pb-24 pt-12 md:pt-20">
        <div className={COLUMN}>
          <div
            className={`grid transition-[grid-template-rows,opacity] ease-out motion-reduce:transition-none ${
              globeVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
            style={FADE_STYLE}
            inert={!globeVisible}
          >
            <header className="min-h-0 overflow-hidden pb-6 text-center animate-[fadeInUp_0.5s_ease-out]">
              <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-4 leading-[1.1] text-balance">
                The places I have been to.
              </h1>
              <p className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed font-light text-balance">
                Where my memories live
              </p>
            </header>
          </div>
          <div className={SCENE_BOX}>
            {globeMounted && (
              <Globe
                visitedIds={VISITED_IDS}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={select}
                resumeId={phase === 'toMap' ? (selected?.id ?? null) : null}
                pullOut={phase === 'toMap' && crossfade}
                diveId={phase === 'toCountry' ? selectedId : null}
                alwaysLabel={!hoverCapable}
                onReady={phase === 'toMap' ? onIncomingReady : undefined}
                className={`absolute inset-0 ${fade(globeVisible)}`}
                style={FADE_STYLE}
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
            <ul aria-label="Visited countries" className="sr-only" inert={!globeVisible}>
              {GALLERY.countries.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(c.id)}
                    onFocus={() => setHoveredId(c.id)}
                    onBlur={() => setHoveredId(null)}
                  >
                    Open {c.name}
                  </button>
                </li>
              ))}
            </ul>
            {countryMounted && stageCountry && stageShape && (
              <CountryStage
                key={stageCountry.id}
                d={stageShape.d}
                centroid={stageShape.centroid}
                model={stageCountry.landmark.model}
                active={phase === 'toMap' ? true : countryVisible}
                direction={phase === 'toMap' ? 'out' : 'in'}
                onReady={phase === 'toCountry' ? onIncomingReady : undefined}
                className={`absolute inset-0 ${fade(countryVisible)}`}
                style={FADE_STYLE}
              />
            )}

            {selected && (
              <div
                className={`absolute inset-0 pointer-events-none ${fade(countryVisible)}`}
                style={FADE_STYLE}
                inert={!countryVisible}
              >
                <button
                  type="button"
                  onClick={back}
                  className="pointer-events-auto absolute top-0 left-0 inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-stone-900/70 backdrop-blur min-h-11 px-4 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors"
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Back to map
                </button>

                <div className="absolute left-0 bottom-0 max-w-sm text-left">
                  <CountryHeading
                    key={`${selected.id}-heading`}
                    country={selected}
                    active={countryVisible}
                  />
                  <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Model: &ldquo;{selected.landmark.name}&rdquo; by{' '}
                    {selected.landmark.attribution.author},{' '}
                    <a
                      href={selected.landmark.attribution.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto inline-flex items-center gap-1 underline hover:text-stone-900 dark:hover:text-stone-50"
                    >
                      {selected.landmark.attribution.license}{' '}
                      <ExternalLink size={10} aria-hidden="true" />
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
