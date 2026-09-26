import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { WanderingEyes } from '@/components/ui/WanderingEyes';

// Loaded on demand: three.js must never run during server rendering.
const loadGlobeScene = () => import('./GlobeScene');
const GlobeScene = lazy(loadGlobeScene);

// Start the download as soon as the page's code runs, not after hydration.
if (typeof window !== 'undefined') void loadGlobeScene().catch(() => {});

export interface GlobeCanvasProps {
  visitedIds: ReadonlySet<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Open already zoomed in on this country. */
  resumeId?: string | null;
  /** Zoom back out from `resumeId`. */
  pullOut?: boolean;
  /** Label every visited country, not just the hovered one. */
  alwaysLabel?: boolean;
  /** Spin to this country and zoom in. */
  diveId?: string | null;
  /** Called after the globe draws its first frame. */
  onReady?: () => void;
  /** The flat map, shown only without WebGL or without JS. Others see a spinner until the globe is ready. */
  fallback: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Cached, since the answer never changes. */
let webglSupported: boolean | null = null;

function supportsWebGL(): boolean {
  if (webglSupported !== null) return webglSupported;
  try {
    const canvas = document.createElement('canvas');
    webglSupported = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    webglSupported = false;
  }
  return webglSupported;
}

/** Shows the 3D globe in the browser, or the flat map if it can't. */
export default function GlobeCanvas({ fallback, className = '', style, onReady, ...scene }: GlobeCanvasProps) {
  // null until mounted: the server can't check for WebGL.
  const [usable, setUsable] = useState<boolean | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setUsable(supportsWebGL());
  }, []);

  // Same wrapper in every case, because the page positions and fades it.
  if (usable === false) {
    return (
      <div className={className} style={style}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {!drawn && (
        <div className="globe-loading pointer-events-none absolute inset-0 grid place-items-center">
          <WanderingEyes className="w-24 text-stone-600 dark:text-stone-300 motion-reduce:[&_span]:animate-none!" />
        </div>
      )}
      {usable === null && (
        <>
          {/* Hidden, but in the HTML so visitors without JS still see the map. */}
          <div className="globe-flat invisible">{fallback}</div>
          <noscript>
            <style>{'.globe-flat{visibility:visible}.globe-loading{display:none}'}</style>
          </noscript>
        </>
      )}
      {usable && (
        <Suspense fallback={null}>
          <div
            className={`h-full w-full motion-safe:transition-opacity motion-safe:duration-500 ${drawn ? '' : 'opacity-0'}`}
          >
            <GlobeScene
              {...scene}
              onReady={() => {
                setDrawn(true);
                onReady?.();
              }}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
