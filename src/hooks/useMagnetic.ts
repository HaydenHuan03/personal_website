import { useCallback, useRef } from 'react';
import { isCoarsePointer, prefersReducedMotion } from '../utils/motion';

/**
 * Nudges an element toward the cursor while hovered, springing back on
 * leave. Pair with the `.magnetic` class in global.css for the transition.
 * No-ops on touch devices and when the user prefers reduced motion.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isCoarsePointer() || prefersReducedMotion()) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    },
    [strength]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
