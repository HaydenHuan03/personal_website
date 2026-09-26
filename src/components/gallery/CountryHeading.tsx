import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ExternalLink } from 'lucide-react';
import type { GalleryCountry } from '@/types/gallery';
import { formatVisitedAt } from '@/lib/gallery';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface CountryHeadingProps {
  country: GalleryCountry;
  active?: boolean;
}

export default function CountryHeading({ country, active = true }: CountryHeadingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    const name = root?.querySelector<HTMLElement>('[data-name]');
    const ctx = document.createElement('canvas').getContext('2d');
    if (!root || !name || !ctx) return;
    const text = country.name.toUpperCase();
    let cancelled = false;

    const fit = () => {
      const style = getComputedStyle(name);
      ctx.font = `${style.fontWeight} 100px ${style.fontFamily}`;
      const m = ctx.measureText(text);
      const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      if (!ink) return;
      const scale = root.clientWidth / ink;
      const inkMiddle =
        50 +
        (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 -
        (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      root.style.setProperty('--name-size', `${100 * scale}px`);
      root.style.setProperty('--name-indent', `${m.actualBoundingBoxLeft * scale}px`);
      root.style.setProperty('--name-shift', `${-inkMiddle * scale}px`);
    };

    const observer = new ResizeObserver(fit);
    observer.observe(root);
    void document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [country.name]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) return;
    const name = root.querySelector<HTMLElement>('[data-name]');
    const rise = root.querySelector<HTMLElement>('[data-name-rise]');
    const meta = root.querySelectorAll<HTMLElement>('[data-meta]');
    if (!name || !rise) return;
    const targets = [name, rise, ...meta];

    if (reducedMotion) {
      gsap.set(targets, { autoAlpha: 1 });
      return () => {
        gsap.set(targets, { clearProps: 'all' });
      };
    }

    // The word rises as a whole; splitting it into letters would break its spacing.
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.set(name, { autoAlpha: 1 })
      .fromTo(rise, { yPercent: 100 }, { yPercent: 0, duration: 1.1, ease: 'expo.out' })
      .fromTo(meta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.6');

    return () => {
      tl.kill();
      gsap.set(targets, { clearProps: 'all' });
    };
  }, [country.id, reducedMotion, active]);

  const { landmark } = country;

  return (
    <div ref={rootRef} className="absolute inset-0">
      <div data-handover="zoom" className="absolute inset-0">
        <h1
          data-name
          className="absolute inset-x-0 top-1/2 mt-[var(--name-shift)] overflow-hidden whitespace-nowrap font-heading text-[length:var(--name-size)] indent-[var(--name-indent)] font-semibold uppercase text-stone-900 dark:text-stone-50 leading-none"
          style={{ visibility: 'hidden' }}
        >
          <span data-name-rise className="block">
            {country.name}
          </span>
        </h1>
      </div>
      <div
        data-handover="fade"
        className="absolute left-6 right-32 md:left-12 md:right-auto bottom-6 md:bottom-10 max-w-sm text-left"
      >
        <p
          data-meta
          className="text-sm md:text-base text-stone-600 dark:text-stone-400"
          style={{ visibility: 'hidden' }}
        >
          {landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
        </p>
        <p data-meta className="mt-3 text-xs text-stone-500 dark:text-stone-400" style={{ visibility: 'hidden' }}>
          Model: &ldquo;{landmark.name}&rdquo; by {landmark.attribution.author},{' '}
          <a
            href={landmark.attribution.source}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1 underline hover:text-stone-900 dark:hover:text-stone-50"
          >
            {landmark.attribution.license} <ExternalLink size={10} aria-hidden="true" />
          </a>
        </p>
      </div>
      {country.photos.length > 0 && (
        <div data-handover="fade" className="absolute right-6 md:right-12 bottom-6 md:bottom-10">
          <p
            data-meta
            className="flex items-end gap-3 text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400"
            style={{ visibility: 'hidden' }}
          >
            {country.photos.length} photos
            <span aria-hidden="true" className="relative h-10 w-px overflow-hidden bg-stone-300 dark:bg-stone-700">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-stone-900 dark:bg-stone-100 animate-[scrollCue_2s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:animate-none" />
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
