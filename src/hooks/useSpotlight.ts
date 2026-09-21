import { useCallback, useRef } from 'react';
import { isCoarsePointer } from '../utils/motion';

/**
 * Tracks pointer position within an element and writes it to CSS vars
 * (--spot-x/--spot-y) consumed by the `.spotlight` class in global.css.
 * No-ops on touch devices, where there's no cursor to track.
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
