import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isCoarsePointer, prefersReducedMotion } from '../utils/motion';

gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger);

export interface SkillBadge {
  label: string;
  categoryId: string;
  border: string;
  dot: string;
  iconClass?: string;
}

export interface SkillsPlaygroundHandle {
  reset(): void;
}

interface Props {
  badges: SkillBadge[];
  activeCategory: string | null;
  ref?: Ref<SkillsPlaygroundHandle>;
}

const DIMMED_OPACITY = 0.3;

export default function SkillsPlayground({ badges, activeCategory, ref }: Props) {
  const canvasRef = useRef<HTMLUListElement>(null);
  const draggablesRef = useRef<Draggable[]>([]);
  const enteredRef = useRef(false);
  const activeRef = useRef<string | null>(activeCategory);
  activeRef.current = activeCategory;

  function badgeOpacity(el: HTMLElement): number {
    const active = activeRef.current;
    return !active || el.dataset.category === active ? 1 : DIMMED_OPACITY;
  }

  function items(): HTMLElement[] {
    const canvas = canvasRef.current;
    return canvas ? Array.from(canvas.querySelectorAll<HTMLElement>('[data-skill-badge]')) : [];
  }

  function reset() {
    const els = items();
    if (els.length === 0) return;
    gsap.killTweensOf(els, 'x,y,scale');
    gsap.to(els, {
      x: 0,
      y: 0,
      scale: 1,
      duration: prefersReducedMotion() ? 0 : 0.5,
      ease: 'back.out(1.4)',
      stagger: 0.01,
      onComplete: () => draggablesRef.current.forEach((d) => d.update()),
    });
  }

  useImperativeHandle(ref, () => ({ reset }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const els = items();
    const reduced = prefersReducedMotion();

    if (!isCoarsePointer()) {
      draggablesRef.current = els.map(
        (el) =>
          Draggable.create(el, {
            type: 'x,y',
            bounds: canvas,
            inertia: !reduced,
            edgeResistance: 0.85,
            minimumMovement: 4,
            zIndexBoost: true,
            cursor: 'grab',
            activeCursor: 'grabbing',
            onPress: () => {
              gsap.killTweensOf(el, 'x,y');
              gsap.to(el, { scale: 1.05, duration: 0.15, ease: 'power2.out' });
            },
            onRelease: () => {
              gsap.to(el, { scale: 1, duration: 0.15, ease: 'power2.out' });
            },
          })[0]
      );
    }

    let entrance: gsap.core.Tween | undefined;
    let trigger: ScrollTrigger | undefined;

    if (reduced) {
      enteredRef.current = true;
      gsap.set(els, { opacity: (_i: number, el: HTMLElement) => badgeOpacity(el) });
    } else {
      gsap.set(els, { opacity: 0 });
      trigger = ScrollTrigger.create({
        trigger: canvas,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          entrance = gsap.fromTo(
            els,
            {
              opacity: 0,
              scale: 0.6,
              x: () => gsap.utils.random(-80, 80),
              y: () => gsap.utils.random(-60, 60),
            },
            {
              opacity: (_i: number, el: HTMLElement) => badgeOpacity(el),
              scale: 1,
              x: 0,
              y: 0,
              duration: 0.6,
              ease: 'back.out(1.6)',
              stagger: 0.03,
              onComplete: () => {
                enteredRef.current = true;
                draggablesRef.current.forEach((d) => d.update());
              },
            }
          );
        },
      });
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reset, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      trigger?.kill();
      entrance?.kill();
      draggablesRef.current.forEach((d) => d.kill());
      draggablesRef.current = [];
      enteredRef.current = false;
      gsap.killTweensOf(els);
      gsap.set(els, { clearProps: 'all' });
    };
    // badges are static data; the playground is fully rebuilt if it ever remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enteredRef.current) return;
    const els = items();
    gsap.to(els, {
      opacity: (_i: number, el: HTMLElement) => badgeOpacity(el),
      duration: prefersReducedMotion() ? 0 : 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  return (
    <ul
      ref={canvasRef}
      aria-label="Tech skills"
      className="relative flex flex-wrap content-start items-start gap-3 p-6 min-h-[320px] md:min-h-[420px] rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 overflow-hidden list-none m-0"
    >
      {badges.map((b) => (
        <li
          key={b.label}
          data-skill-badge
          data-category={b.categoryId}
          className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-white border-2 ${b.border} text-sm font-medium text-stone-800 select-none touch-none`}
        >
          <span aria-hidden="true" className={`w-2 h-2 rounded-full ${b.dot}`} />
          {b.iconClass && <i className={`${b.iconClass} text-base leading-none`} aria-hidden="true" />}
          {b.label}
        </li>
      ))}
    </ul>
  );
}
