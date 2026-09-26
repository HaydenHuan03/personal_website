import { useCallback, useRef } from 'react';
import { isCoarsePointer, prefersReducedMotion } from '@/lib/motion';

/**
 * Moves an element slightly toward the cursor, and back when it leaves. Use
 * with the `.magnetic` class. Does nothing on touch screens or with reduced motion.
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
