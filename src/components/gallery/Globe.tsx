import { lazy, Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useMounted } from '../../hooks/useMounted';

// Dynamic: this module graph pulls in three.js and the equirectangular
// snapshot, neither of which must be evaluated during SSR on the Worker -
// importing @react-three/fiber there drags in a second React copy and nulls
// the hook dispatcher.
const GlobeScene = lazy(() => import('./GlobeScene'));

export interface GlobeProps {
  visitedIds: ReadonlySet<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Open facing this country, already dived in. See GlobeScene. */
  resumeId?: string | null;
  /** Run the pull-back out of the dive. */
  pullOut?: boolean;
  /** Label every visited country, not just the hovered one. See GlobeScene. */
  alwaysLabel?: boolean;
  /** Spin round and dive towards this country. See GlobeScene. */
  diveId?: string | null;
  /** Fired once the sphere has drawn a frame. */
  onReady?: () => void;
  /**
   * Shown until the globe can take over, and kept for good if it cannot: on
   * the server, while the chunk loads, and where WebGL is unavailable. The
   * flat map is passed here, so the gallery works before and without JS.
   */
  fallback: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Cached across mounts; the answer cannot change within a session. */
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

/** Client-only host for the globe, with the flat map as its safety net. */
export default function Globe({ fallback, className = '', style, ...scene }: GlobeProps) {
  const mounted = useMounted();
  const [usable, setUsable] = useState(false);

  useEffect(() => {
    setUsable(supportsWebGL());
  }, []);

  // The wrapper stays either way: the page positions and cross-fades this box,
  // and the flat map has to sit in it exactly as the globe does.
  if (!mounted || !usable) {
    return (
      <div className={className} style={style}>
        {fallback}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <Suspense fallback={fallback}>
        <GlobeScene {...scene} />
      </Suspense>
    </div>
  );
}

export function preloadGlobe() {
  void import('./GlobeScene');
}
