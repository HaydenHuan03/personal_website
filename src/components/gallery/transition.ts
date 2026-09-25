/**
 * Timings shared by the page and the two 3D scenes it cross-fades between.
 *
 * They live in their own module because the page must not import GlobeScene or
 * CountryScene to read a number: both of those module graphs pull in three.js,
 * which would drag the whole renderer into the page's own chunk and evaluate it
 * during SSR on the Worker.
 */

/** The globe's spin-to-face plus dive, i.e. how long the zoom in runs. */
export const DIVE_MS = 1150;

/** The globe's pull-back out of the dive, once it is visible again. */
export const PULL_OUT_MS = 1050;

/** The country scene's climb from the resting view back to overhead. */
export const CLIMB_MS = 900;

/** How long the two canvases overlap. Long enough to read as a dissolve. */
export const CROSSFADE_MS = 420;

/**
 * How long the dive will wait for the incoming scene's chunk, geometry and
 * model. Past this the cross-fade runs anyway: a stalled network must not
 * leave a click looking like it did nothing.
 */
export const READY_CAP_MS = 700;

/** How close the dive gets, as a fraction of the fitted camera distance. */
export const ZOOM_TO = 0.325;

/**
 * How close it is allowed to creep while waiting for the stage.
 *
 * The dive does not stop when its clock runs out: a camera that halts and then
 * hands over reads as a stall, however short the wait. It keeps going at the
 * speed it had, and this is where it finally runs out of room.
 */
export const ZOOM_FLOOR = 0.232;
