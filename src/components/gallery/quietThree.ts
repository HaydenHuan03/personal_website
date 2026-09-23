import { setConsoleFunction } from 'three';

// @react-three/fiber (<= 9.8) still creates a THREE.Clock per <Canvas>, which
// three r185+ warns about on every mount. Drop only that message until fiber
// moves to THREE.Timer; everything else three logs passes through unchanged.
const CLOCK_DEPRECATION = 'THREE.Clock: This module has been deprecated';

setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
  if (type === 'warn' && message.startsWith(CLOCK_DEPRECATION)) return;
  console[type](message, ...params);
});
