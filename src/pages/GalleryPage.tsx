import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WorldMap, { WORLD_MAP } from '../components/gallery/WorldMap';
import LandmarkMarker from '../components/gallery/LandmarkMarker';
import CountryHeading from '../components/gallery/CountryHeading';
import CountryStage, { preloadCountryScene } from '../components/gallery/CountryStage';
import Globe from '../components/gallery/Globe';
import PhotoStream from '../components/gallery/PhotoStream';
import { useStageHandover } from '../components/gallery/useStageHandover';
import { preloadLandmark } from '../components/gallery/LandmarkCanvas';
import { CLIMB_MS, CROSSFADE_MS, DIVE_MS, READY_CAP_MS } from '../components/gallery/transition';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { GALLERY } from '../data/gallery';
import { findCountry, unionBbox } from '../utils/gallery';

const VISITED_IDS: ReadonlySet<string> = new Set(GALLERY.countries.map((c) => c.id));

// The whole screen, with the nav floating over it. Sticky, so the photos
// slide up over it rather than pushing it away.
const STAGE = 'sticky top-0 h-svh min-h-[32rem] overflow-hidden';

// Where both canvases sit: the same box, so the globe's dive hands over to
// the country at the same size, and below the nav so the spire is not hidden.
const SCENE = 'absolute inset-x-0 top-28 bottom-0';

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
  const stageRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const recedeRef = useRef(0);
  const [stagePassed, setStagePassed] = useState(false);
  // Built behind the end of the photos, so leaving from there finds it ready.
  const [globeWarm, setGlobeWarm] = useState(false);
  const warmGlobe = useCallback(() => setGlobeWarm(true), []);

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
    setGlobeWarm(false);
    setPhase(settled);
    window.scrollTo(0, 0);
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
    window.scrollTo(0, 0);
    incomingReady.current = false;
    setCrossfade(false);
    setPhase('toMap');
  }, [reducedMotion, setSearchParams]);

  // From the end of the photos the building is far behind, so there is no climb out of it.
  const leave = useCallback(() => setSearchParams({}), [setSearchParams]);

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
  const headerVisible = phase === 'map' || (phase === 'toMap' && crossfade);
  const globeMounted = phase !== 'country' || globeWarm;
  const countryMounted = (phase !== 'map' || stageWarm) && Boolean(stageCountry && stageShape);

  const onIncomingReady = useCallback(() => {
    incomingReady.current = true;
  }, []);

  const showPhotos = phase === 'country' && Boolean(selected?.photos.length);
  useStageHandover({
    enabled: showPhotos,
    stage: stageRef,
    sheet: sheetRef,
    recede: recedeRef,
    onPassed: setStagePassed,
  });

  return (
    <>
      <Navbar floating />
      <main id="main-content">
        <section ref={stageRef} aria-label="Gallery" className={STAGE}>
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
              // Softened at the top, where the dive fills the box right up to its edge.
              className={`${SCENE} [mask-image:linear-gradient(to_bottom,transparent,#000_4rem)] ${fade(globeVisible)}`}
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
          <header
            className={`pointer-events-none absolute inset-x-0 top-28 px-6 text-center animate-[fadeInUp_0.5s_ease-out] ${fade(headerVisible)}`}
            style={FADE_STYLE}
            inert={!headerVisible}
          >
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-4 leading-[1.1] text-balance">
              The places I have been to.
            </h1>
            <p className="text-lg text-stone-600 dark:text-stone-400 leading-relaxed font-light text-balance">
              Where my memories live
            </p>
          </header>
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

          {/* Before the stage, so the canvas draws the landmark over the text. */}
          {selected && (
            <div
              className={`absolute inset-0 overflow-hidden pointer-events-none ${fade(countryVisible)}`}
              style={FADE_STYLE}
              inert={!countryVisible}
            >
              <CountryHeading
                key={`${selected.id}-heading`}
                country={selected}
                active={countryVisible}
              />
            </div>
          )}
          {countryMounted && stageCountry && stageShape && (
            <div data-handover="model" className="pointer-events-none absolute inset-0">
              <CountryStage
                key={stageCountry.id}
                d={stageShape.d}
                centroid={stageShape.centroid}
                model={stageCountry.landmark.model}
                active={phase === 'toMap' ? true : countryVisible && !stagePassed}
                direction={phase === 'toMap' ? 'out' : 'in'}
                onReady={phase === 'toCountry' ? onIncomingReady : undefined}
                recede={recedeRef}
                className={`${SCENE} ${fade(countryVisible)}`}
                style={FADE_STYLE}
              />
            </div>
          )}

          {showPhotos && (
            <div data-handover="dim" className="pointer-events-none absolute inset-0 bg-stone-950 opacity-0" />
          )}

          {selected && (
            <div
              className={`absolute inset-0 pointer-events-none ${fade(countryVisible)}`}
              style={FADE_STYLE}
              inert={!countryVisible}
            >
              <button
                type="button"
                data-handover="fade"
                onClick={back}
                className="pointer-events-auto absolute top-28 left-6 md:left-12 inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-stone-900/70 backdrop-blur min-h-11 px-4 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Back to map
              </button>
            </div>
          )}
        </section>
        {showPhotos && selected && (
          <>
            {/* Scroll room for the name to zoom through before the photos arrive. */}
            <div aria-hidden="true" className="motion-safe:h-[40svh]" />
            <PhotoStream key={selected.id} ref={sheetRef} country={selected} onBack={leave} onEnd={warmGlobe} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
