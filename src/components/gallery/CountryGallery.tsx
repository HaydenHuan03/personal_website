import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import ImageLightbox from '../ImageLightbox';
import type { GalleryCountry } from '../../types/gallery';
import { formatVisitedAt } from '../../utils/gallery';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface CountryGalleryProps {
  country: GalleryCountry;
  onBack: () => void;
}

/**
 * Photo panel for a selected country. On mount it zooms the map into the
 * country and staggers the tiles in; on unmount the timeline is killed, the
 * tweened props are cleared, and the map viewBox animates back out.
 */
export default function CountryGallery({ country, onBack }: CountryGalleryProps) {
  const panelRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { landmark, photos } = country;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const tiles = Array.from(panel.querySelectorAll<HTMLElement>('[data-tile]'));
    const head = panel.querySelector<HTMLElement>('[data-head]');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const dur = (s: number) => (reducedMotion ? 0 : s);

    // Starts after the map has mostly finished lying down and zooming in.
    tl.fromTo(panel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: dur(0.5) }, dur(0.7));
    if (head) {
      tl.fromTo(head, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: dur(0.4) }, '<0.05');
    }
    if (tiles.length) {
      tl.fromTo(
        tiles,
        { autoAlpha: 0, y: 40, scale: 0.9 },
        { autoAlpha: 1, y: 0, scale: 1, duration: dur(0.5), stagger: dur(0.04) },
        '<0.1'
      );
    }

    return () => {
      tl.kill();
      gsap.set([panel, head, ...tiles].filter(Boolean) as HTMLElement[], { clearProps: 'all' });
    };
  }, [country.id, reducedMotion]);

  return (
    <section
      ref={panelRef}
      aria-label={`${country.name} gallery`}
      className="mt-8"
      style={{ visibility: 'hidden' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to map
      </button>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start">
        <div className="md:sticky md:top-24">
          <div data-head>
            <h2 className="font-heading text-3xl font-semibold text-stone-900">{country.name}</h2>
            <p className="text-stone-600">
              {landmark.name} &middot; {formatVisitedAt(country.visitedAt)}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Model: &ldquo;{landmark.name}&rdquo; by {landmark.attribution.author},{' '}
              <a
                href={landmark.attribution.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:text-stone-900"
              >
                {landmark.attribution.license} <ExternalLink size={10} aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>

        <ul className="columns-2 gap-3 md:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid">
          {photos.map((photo, i) => (
            <li key={photo.id} data-tile>
              <ImageLightbox
                src={photo.src}
                alt={photo.caption || `${country.name} photo ${i + 1}`}
                className="w-full rounded-xl object-cover"
              />
              {photo.caption && <p className="mt-1 text-xs text-stone-500">{photo.caption}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
