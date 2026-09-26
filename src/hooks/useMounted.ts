import { useEffect, useState } from 'react';

/** False on the server and during hydration, true after mount. For browser-only UI. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
