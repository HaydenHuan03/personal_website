import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface CountryHeadingProps {
  country: GalleryCountry;
  active?: boolean;
}

export default function CountryHeading({ country, active = true }: CountryHeadingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) return;
    const name = root.querySelector<HTMLElement>('[data-name]');
    const meta = root.querySelector<HTMLElement>('[data-meta]');
    const targets = [name, meta].filter(Boolean) as HTMLElement[];
    if (!targets.length) return;

    if (reducedMotion) {
      gsap.set(targets, { autoAlpha: 1 });
      return () => {
        gsap.set(targets, { clearProps: 'all' });
      };
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      name,
      { autoAlpha: 0, y: 20, letterSpacing: '0.34em' },
      { autoAlpha: 1, y: 0, letterSpacing: '0em', duration: 0.9 }
    );
    if (meta) {
      tl.fromTo(meta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.45');
    }

    return () => {
      tl.kill();
      gsap.set(targets, { clearProps: 'all' });
    };
  }, [country.id, reducedMotion, active]);

  return (
    <div ref={rootRef}>
      <h1
        data-name
        className="font-heading text-3xl md:text-4xl font-semibold text-stone-900 dark:text-stone-50 leading-[1.1] text-balance"
        style={{ visibility: 'hidden' }}
      >
        {country.name}
      </h1>
      <p
        data-meta
        className="mt-2 text-sm md:text-base text-stone-600 dark:text-stone-400"
        style={{ visibility: 'hidden' }}
      >
        {country.landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
      </p>
    </div>
  );
}
