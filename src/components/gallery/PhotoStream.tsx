import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft } from 'lucide-react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { GalleryCountry, GalleryPhoto } from '../../types/gallery';
import { bubbleSpots, formatVisitedAt, photoAlt, photoLayout } from '../../utils/gallery';
import { useReducedMotion } from '../../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** The manifest's thumbnail size: its long edge, in pixels. */
const THUMB_EDGE = 480;

/**
 * A photo's flight, in equal fifths of its time: out of the depths, settling
 * almost centred, held there, sliding off towards its wall, then past the
 * viewer. It stays opaque until it is mostly off to the side, so the next
 * photo, already settling behind it, is covered cleanly rather than showing
 * through.
 */
const FLIGHT_Z = [-2600, -900, -150, 0, 80, 700];
/** Sideways, as a share of the photo's own width. */
const FLIGHT_SIDE = [70, 35, 8, 4, 30, 110];
/** Turned in towards the tunnel's centre far away, straight on once settled. */
const FLIGHT_TURN = [28, 14, 2, 0, 0, 0];
const FLIGHT_ALPHA = [0, 1, 1, 1, 1, 0];
/** Where in its flight a photo takes focus: settling, with the one before it slid off. */
const FOCUS_FROM = 0.45;
/** Timeline gap between one photo setting off and the next, as a share of a photo's flight. */
const STAGGER = 0.45;
/** How long the ending holds, in photo flights, before the tunnel lets go. */
const TAIL = 0.6;
/** Scrolling, in svh, between one photo setting off and the next. */
const SCROLL_PER_PHOTO = 50;
/** Scrolling back up this far, in pixels, after the bubble pops gathers the photos back into it. */
const RECOLLECT_AFTER = 40;

/** Written in by sweeping `--ink` from 0% to past 100%. */
const INK: CSSProperties = {
  maskImage: 'linear-gradient(90deg, #000 calc(var(--ink) - 10%), transparent var(--ink))',
};

function srcSet(photo: GalleryPhoto): string {
  const thumbWidth = Math.round(photo.width * Math.min(1, THUMB_EDGE / Math.max(photo.width, photo.height)));
  return `${photo.thumb} ${thumbWidth}w, ${photo.src} ${photo.width}w`;
}

function PhotoFigure({
  photo,
  index,
  country,
  sizes,
  className,
  frameClassName = '',
  captionClassName = '',
  style,
}: {
  photo: GalleryPhoto;
  index: number;
  country: GalleryCountry;
  sizes: string;
  className: string;
  frameClassName?: string;
  captionClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <figure data-photo className={className} style={style}>
      <div
        className={`overflow-hidden bg-stone-200 dark:bg-stone-800 ${frameClassName}`}
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      >
        <img
          src={photo.src}
          srcSet={srcSet(photo)}
          sizes={sizes}
          width={photo.width}
          height={photo.height}
          alt={photoAlt(photo, country.name, index, country.photos.length)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <figcaption
        className={`mt-3 flex gap-3 text-sm text-stone-500 dark:text-stone-400 ${captionClassName}`}
      >
        <span className="tabular-nums text-stone-400 dark:text-stone-500">
          {String(index + 1).padStart(2, '0')}
        </span>
        {photo.caption}
      </figcaption>
    </figure>
  );
}

/** Lights a round photo as a glass sphere: shaded away from the light, with a soap-film rim. */
function Glass() {
  return (
    <>
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.28)] [background-image:radial-gradient(16%_9%_at_35%_19%,rgb(255_255_255/0.95),rgb(255_255_255/0.45)_45%,transparent),radial-gradient(4%_4%_at_71%_79%,rgb(255_255_255/0.6),transparent),radial-gradient(circle_at_36%_30%,transparent_62%,rgb(255_255_255/0.22)_76%,transparent_80%),radial-gradient(circle_at_38%_32%,transparent_32%,rgb(12_10_9/0.4)_58%,rgb(12_10_9/0.85)_80%)]" />
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-30 mix-blend-screen [background-image:conic-gradient(from_200deg,rgb(255_140_200),rgb(140_220_255),rgb(170_255_170),rgb(255_220_140),rgb(255_140_200))] [mask-image:radial-gradient(circle_closest-side,transparent_78%,#000_98%)]" />
    </>
  );
}

interface PhotoStreamProps {
  country: GalleryCountry;
  onBack: () => void;
  /** Told once the ending comes into view. */
  onEnd?: () => void;
  ref?: Ref<HTMLElement>;
}

/**
 * The country's photos as a dark tunnel: pinned to the screen while the page
 * scrolls, each photo in turn comes out of the depths from alternating sides,
 * settles into the middle to be looked at, then flies past. The screen behind
 * takes on the colours of the photo in focus. At the end a big bubble waits;
 * popping it scatters every photo as a small bubble around the handwritten
 * closing words. Reduced motion gets the photos as a still, zig-zagging grid
 * instead.
 */
export default function PhotoStream({ country, onBack, onEnd, ref }: PhotoStreamProps) {
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef<HTMLDivElement>(null);
  const bigRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<() => void>(undefined);
  const frontCanvas = useRef(0);
  const [focus, setFocus] = useState(0);
  const layout = useMemo(() => photoLayout(country.photos), [country.photos]);
  const spots = useMemo(() => bubbleSpots(country.photos.length), [country.photos.length]);
  const total = country.photos.length;

  useEffect(() => {
    const track = trackRef.current;
    const big = bigRef.current;
    const end = endRef.current;
    const ending = endingRef.current;
    if (reducedMotion || !track || !big || !end || !ending) return;
    const ctx = gsap.context(() => {
      const figures = gsap.utils.toArray<HTMLElement>('[data-photo]', track);
      const drifts = gsap.utils.toArray<HTMLElement>('[data-drift]', track).map((el) =>
        gsap.to(el, {
          x: 'random(-18, 18)',
          y: 'random(-24, 24)',
          duration: gsap.utils.random(3, 6),
          ease: 'sine.inOut',
          repeat: -1,
          repeatRefresh: true,
          paused: true,
        })
      );

      let peak = 0;
      const burst = gsap
        .timeline({
          paused: true,
          onStart: () => drifts.forEach((d) => d.play()),
          onReverseComplete: () => drifts.forEach((d) => d.pause()),
        })
        .to(big.querySelector('button'), { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, 0)
        .to(big.querySelector('[data-pop-visual]'), { scale: 1.3, duration: 0.3, ease: 'power2.out' }, 0)
        .set(big.querySelector('[data-pop-ring]'), { autoAlpha: 0.8 }, 0.001)
        .to(
          big.querySelector('[data-pop-ring]'),
          { scale: 1.8, autoAlpha: 0, duration: 0.7, ease: 'power2.out' },
          0.001
        )
        .fromTo(
          '[data-bubble]',
          { '--spread': 0, autoAlpha: 0 },
          {
            '--spread': 1,
            autoAlpha: 1,
            duration: 1.8,
            ease: 'expo.out',
            stagger: { each: 0.04, from: 'random' },
          },
          0.05
        )
        .fromTo(
          '[data-drift]',
          { scale: 0.3 },
          {
            scale: 1,
            duration: 1.8,
            ease: 'expo.out',
            stagger: { each: 0.04, from: 'random' },
          },
          0.05
        )
        .set(end, { autoAlpha: 1 }, 0.3);
      end.querySelectorAll<HTMLElement>('[data-ink]').forEach((ink, i) => {
        burst.fromTo(
          ink,
          { '--ink': '0%' },
          {
            '--ink': '115%',
            duration: 0.3 + (ink.textContent?.length ?? 0) * 0.07,
            ease: 'sine.inOut',
          },
          i === 0 ? 0.6 : '>'
        );
      });
      burst.fromTo(
        end.querySelectorAll('[data-end-meta]'),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
        '>-0.1'
      );
      const recollect = () => burst.timeScale(2).reverse();
      popRef.current = () => {
        peak = window.scrollY;
        burst.timeScale(1).play();
      };

      let focused = 0;
      let ended = false;
      let arriveAt = Infinity;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            if (burst.reversed() || !burst.progress()) return;
            peak = Math.max(peak, self.scroll());
            if (self.scroll() < peak - RECOLLECT_AFTER) recollect();
          },
        },
        onUpdate: () => {
          const i = gsap.utils.clamp(0, total - 1, Math.floor((tl.time() - FOCUS_FROM) / STAGGER));
          if (i !== focused) {
            focused = i;
            setFocus(i);
          }
          if (!ended && tl.time() >= arriveAt) {
            ended = true;
            onEnd?.();
          }
          if (tl.time() < arriveAt && burst.progress() && !burst.reversed()) recollect();
        },
      });
      figures.forEach((figure, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        gsap.set(figure, {
          xPercent: -50 + side * FLIGHT_SIDE[0],
          yPercent: -50,
          rotationY: -side * FLIGHT_TURN[0],
          z: FLIGHT_Z[0],
          autoAlpha: 0,
        });
        tl.to(
          figure,
          {
            keyframes: {
              z: FLIGHT_Z,
              xPercent: FLIGHT_SIDE.map((s) => -50 + side * s),
              rotationY: FLIGHT_TURN.map((t) => -side * t),
              autoAlpha: FLIGHT_ALPHA,
              easeEach: 'none',
            },
            duration: 1,
            ease: 'none',
          },
          i * STAGGER
        );
      });
      const photosEnd = tl.duration();
      arriveAt = photosEnd - 0.15;
      const chrome = [ambientRef.current, hudRef.current, progressRef.current?.parentElement];
      tl.fromTo(chrome, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.1)
        .to(chrome, { autoAlpha: 0, duration: 0.3 }, photosEnd - 0.3)
        .fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, duration: photosEnd, ease: 'none' }, 0)
        .fromTo(ending, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: 'none' }, arriveAt)
        .fromTo(big, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: 'power2.out' }, arriveAt)
        .set({}, {}, photosEnd + TAIL);
    }, track);
    return () => {
      ctx.revert();
      popRef.current = undefined;
    };
  }, [reducedMotion, country.id, total, onEnd]);

  // Paints the photo in focus into a tiny canvas the browser stretches to fill
  // the screen, which softens it into a wash of its colours without the cost
  // of a live blur filter, then cross-fades it over the previous one.
  useEffect(() => {
    if (reducedMotion) return;
    const canvases = ambientRef.current?.querySelectorAll('canvas');
    const img = trackRef.current?.querySelectorAll<HTMLImageElement>('[data-photo] img')[focus];
    if (!canvases || canvases.length < 2 || !img) return;
    const prev = canvases[frontCanvas.current];
    const next = canvases[frontCanvas.current ^ 1];
    let fade: gsap.core.Timeline | undefined;
    const paint = () => {
      const context = next.getContext('2d');
      if (!context) return;
      context.imageSmoothingQuality = 'high';
      context.drawImage(img, 0, 0, next.width, next.height);
      frontCanvas.current ^= 1;
      fade = gsap
        .timeline({ defaults: { duration: 0.8, ease: 'power1.inOut' } })
        .to(next, { opacity: 1 }, 0)
        .to(prev, { opacity: 0 }, 0);
    };
    if (img.complete && img.naturalWidth) paint();
    else img.addEventListener('load', paint, { once: true });
    return () => {
      img.removeEventListener('load', paint);
      fade?.kill();
    };
  }, [focus, reducedMotion]);

  if (reducedMotion) {
    return (
      <section
        ref={ref}
        aria-labelledby="photos-heading"
        className="relative z-10 rounded-t-[2rem] md:rounded-t-[3rem] border-t border-stone-200/70 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shadow-[0_-24px_48px_-24px_rgba(28,25,23,0.1)] pt-20 md:pt-28 pb-32"
      >
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <header className="flex flex-wrap items-end justify-between gap-4 pb-14 md:pb-20">
            <h2
              id="photos-heading"
              className="font-heading text-4xl md:text-6xl font-semibold tracking-tighter leading-none text-stone-900 dark:text-stone-50"
            >
              Photos
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 tabular-nums">
              {total} photos &middot; {formatVisitedAt(country.visitedAt)}
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-12 items-start gap-x-6 gap-y-14 md:gap-y-24">
            {country.photos.map((photo, i) => {
              const place = layout[i];
              return (
                <PhotoFigure
                  key={photo.id}
                  photo={photo}
                  index={i}
                  country={country}
                  sizes={`(min-width: 768px) ${Math.round((place.span / 12) * 100)}vw, 100vw`}
                  className={`md:[grid-column:var(--col)] md:[grid-row:var(--row)] ${place.offset ? 'md:mt-32' : ''}`}
                  style={
                    {
                      '--col': `${place.start} / span ${place.span}`,
                      '--row': place.row,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const trackHeight = (((total - 1) * STAGGER + 1 + TAIL) / STAGGER) * SCROLL_PER_PHOTO + 100;
  const current = country.photos[focus];
  const first = country.photos[0];

  return (
    <section ref={ref} aria-labelledby="photos-heading" className="relative z-10">
      <div ref={trackRef} style={{ height: `${trackHeight}svh` }}>
        <div className="sticky top-0 h-svh overflow-hidden [perspective:900px]">
          <div ref={ambientRef} aria-hidden="true" className="absolute inset-0 invisible">
            <canvas width={32} height={20} className="absolute inset-0 h-full w-full opacity-0" />
            <canvas width={32} height={20} className="absolute inset-0 h-full w-full opacity-0" />
            <div className="absolute inset-0 bg-stone-950/55 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(12_10_9/0.8)_100%)]" />
          </div>

          {/* Its own layer, so the photos are drawn by depth rather than in page
              order: overflow-hidden on the viewport would flatten them. */}
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {country.photos.map((photo, i) => (
              <PhotoFigure
                key={photo.id}
                photo={photo}
                index={i}
                country={country}
                sizes="(min-width: 768px) 56vw, 84vw"
                className="absolute left-1/2 top-1/2 w-[min(84vw,calc(56svh*var(--ar)))] md:w-[min(56vw,calc(66svh*var(--ar)))]"
                frameClassName="ring-1 ring-white/10"
                captionClassName="sr-only"
                style={{ '--ar': photo.width / photo.height } as CSSProperties}
              />
            ))}
          </div>

          <div
            ref={hudRef}
            className="invisible absolute inset-x-6 md:inset-x-12 bottom-6 md:bottom-10 flex items-end justify-between gap-6"
          >
            <div className="min-w-0">
              <h2 id="photos-heading" className="text-xs uppercase tracking-[0.2em] text-stone-400">
                Photos &middot; {formatVisitedAt(country.visitedAt)}
              </h2>
              <p
                key={focus}
                className="mt-3 truncate font-heading text-2xl md:text-4xl font-semibold tracking-tight text-stone-50 animate-[fadeInUp_0.5s_ease-out]"
              >
                {current?.caption || country.name}
              </p>
            </div>
            <p className="shrink-0 font-heading text-sm tabular-nums text-stone-400">
              <span className="text-stone-50">{String(focus + 1).padStart(2, '0')}</span> /{' '}
              {String(total).padStart(2, '0')}
            </p>
          </div>
          <div ref={endingRef} className="invisible absolute inset-0 bg-stone-50 dark:bg-stone-950">
            <div aria-hidden="true" className="absolute inset-0">
              {country.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  data-bubble
                  className="invisible absolute left-1/2 top-1/2"
                  style={
                    {
                      '--x': spots[i].x,
                      '--y': spots[i].y,
                      '--s': spots[i].size,
                      translate:
                        'calc(-50% + var(--x) * var(--spread, 0) * 1vw) calc(-50% + var(--y) * var(--spread, 0) * 1svh)',
                    } as CSSProperties
                  }
                >
                  <div
                    data-drift
                    className="relative size-[calc(var(--s)*20vmin)] md:size-[calc(var(--s)*18vmin)] overflow-hidden rounded-full"
                  >
                    <img
                      src={photo.thumb}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full scale-110 object-cover"
                    />
                    <Glass />
                  </div>
                </div>
              ))}
            </div>

            {first && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div ref={bigRef} className="relative">
                  <span
                    data-pop-ring
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-stone-900/25 dark:border-white/40 opacity-0"
                  />
                  <button
                    type="button"
                    onClick={() => popRef.current?.()}
                    aria-label={`Open the memories of ${country.name}`}
                    className="pointer-events-auto relative block rounded-full animate-[bubbleFloat_4s_ease-in-out_infinite] transition-[scale] duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900/50 dark:focus-visible:outline-white/60"
                  >
                    <span
                      data-pop-visual
                      className="relative block size-[min(64vw,40svh)] overflow-hidden rounded-full shadow-[0_32px_80px_-24px_rgb(28_25_23/0.35)] dark:shadow-[0_32px_80px_-24px_rgb(0_0_0/0.7)]"
                    >
                      <img
                        src={first.src}
                        srcSet={srcSet(first)}
                        sizes="min(64vw, 40svh)"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full scale-110 object-cover"
                      />
                      <Glass />
                    </span>
                    <span className="absolute left-1/2 top-full mt-6 -translate-x-1/2 whitespace-nowrap text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-300">
                      <span className="pointer-coarse:hidden">Click</span>
                      <span className="hidden pointer-coarse:inline">Tap</span> to open
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div
              ref={endRef}
              className="invisible absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center"
            >
              <p className="flex flex-col items-center font-hand font-medium leading-tight text-stone-900 dark:text-stone-50">
                <span data-ink className="px-[0.2em] text-4xl md:text-6xl" style={INK}>
                  Memories of
                </span>
                <span data-ink className="px-[0.2em] text-7xl md:text-9xl" style={INK}>
                  {country.name}
                </span>
              </p>
              <p data-end-meta className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 tabular-nums">
                {total} photos &middot; {formatVisitedAt(country.visitedAt)}
              </p>
              <div data-end-meta className="mt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-900/15 bg-stone-900/5 px-5 text-sm font-medium text-stone-700 transition-[background-color,transform] hover:bg-stone-900/10 active:scale-[0.98] dark:border-white/15 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-white/10"
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Back to map
                </button>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="invisible absolute inset-x-0 bottom-0 h-px bg-stone-50/10">
            <div ref={progressRef} className="h-full origin-left bg-stone-50/60" />
          </div>
        </div>
      </div>
    </section>
  );
}
