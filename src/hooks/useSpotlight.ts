import { useCallback, useRef } from 'react';
import { isCoarsePointer } from '@/lib/motion';

/**
 * Writes the cursor position inside the element to --spot-x/--spot-y, which the
 * `.spotlight` class uses. Does nothing on touch screens.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (isCoarsePointer()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--spot-x', `${x}%`);
    el.style.setProperty('--spot-y', `${y}%`);
  }, []);

  return { ref, onMouseMove };
}
