import { setConsoleFunction } from 'three';

const CLOCK_DEPRECATION = 'THREE.Clock: This module has been deprecated';

setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...params: unknown[]) => {
  if (type === 'warn' && message.startsWith(CLOCK_DEPRECATION)) return;
  console[type](message, ...params);
});
