function mediaMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

export function prefersReducedMotion(): boolean {
  return mediaMatches('(prefers-reduced-motion: reduce)');
}

export function isCoarsePointer(): boolean {
  return mediaMatches('(pointer: coarse)');
}
