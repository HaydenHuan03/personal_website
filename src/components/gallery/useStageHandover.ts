import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StageHandover {
  enabled: boolean;
  /**
   * The stage. Its `data-handover` parts animate: "zoom" grows, "model" fades
   * out, "fade" hides as soon as you scroll, and "dim" darkens the screen.
   */
  stage: RefObject<HTMLElement | null>;
  /** The photos section. It takes over when its top reaches the top of the screen. */
  sheet: RefObject<HTMLElement | null>;
  /** How far the country scene's camera pulls back, 0 to 1. */
  recede: RefObject<number>;
  /** Called when the photos cover the screen, so the 3D scene can stop drawing. */
  onPassed: (passed: boolean) => void;
}

/** Scroll-driven hand-over from the country stage to the photos: the name zooms in, then the photos take over. */
export function useStageHandover({ enabled, stage, sheet, recede, onPassed }: StageHandover) {
  useEffect(() => {
    const stageEl = stage.current;
    const sheetEl = sheet.current;
    if (!enabled || !stageEl || !sheetEl) return;

    const passed = ScrollTrigger.create({
      trigger: sheetEl,
      start: 'top top',
      onEnter: () => onPassed(true),
      onLeaveBack: () => onPassed(false),
    });

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const part = (name: string) => stageEl.querySelectorAll(`[data-handover="${name}"]`);
      gsap
        .timeline({
          scrollTrigger: {
            start: 0,
            end: () => sheetEl.offsetTop,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })
        .to(part('fade'), { autoAlpha: 0, duration: 0.12, ease: 'none' }, 0)
        // 2D transforms keep the text sharp as it grows.
        .fromTo(
          part('zoom'),
          { scale: 1 },
          { scale: 12, duration: 1, ease: 'power3.in', force3D: false },
          0
        )
        .to(part('zoom'), { autoAlpha: 0, duration: 0.25, ease: 'none' }, 0.75)
        .to(part('model'), { autoAlpha: 0, duration: 0.2, ease: 'none' }, 0.45)
        .fromTo(part('dim'), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'none' }, 0.55)
        .to(recede, { current: 1, duration: 0.6, ease: 'power1.inOut' }, 0);
    });

    return () => {
      passed.kill();
      mm.revert();
      onPassed(false);
    };
  }, [enabled, stage, sheet, recede, onPassed]);
}
