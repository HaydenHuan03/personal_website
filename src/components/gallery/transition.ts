/**
 * Timings shared by the gallery page and its two 3D scenes. Kept in their own
 * file so the page can read them without importing three.js.
 */

/** How long the globe spins and zooms in to a country. */
export const DIVE_MS = 1150;

/** How long the globe zooms back out when returning to the map. */
export const PULL_OUT_MS = 1050;

/** How long the country scene's camera takes to rise back overhead. */
export const CLIMB_MS = 900;

/** Easing that starts fast and slows to a stop. */
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/** How long the globe and country scene cross-fade. */
export const CROSSFADE_MS = 420;

/** Longest wait for the next scene to load before cross-fading anyway. */
export const READY_CAP_MS = 700;

/** How far the globe zooms in, as a fraction of the normal camera distance. */
export const ZOOM_TO = 0.325;

/** The closest the globe keeps zooming to while it waits for the country scene. */
export const ZOOM_FLOOR = 0.232;
