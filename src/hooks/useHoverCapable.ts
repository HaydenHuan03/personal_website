import { useMediaQuery } from './useMediaQuery';

/** True on devices with a fine pointer that can hover (mouse/trackpad). */
export const useHoverCapable = () => useMediaQuery('(hover: hover) and (pointer: fine)');
