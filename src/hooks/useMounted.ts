import { useEffect, useState } from 'react';

/** False during SSR and the hydration pass; true after mount. Gates client-only UI (WebGL). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
