import { lazy, Suspense, type CSSProperties, type RefObject } from 'react';
import { useMounted } from '../../hooks/useMounted';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Dynamic: this module graph pulls in three.js, which must never be evaluated
// during SSR on the Worker (it drags in a second React copy).
const CountryScene = lazy(() => import('./CountryScene'));

export interface CountryStageProps {
  d: string;
  centroid: [number, number];
  model: string;
  /** Whether the camera move is running; see CountryScene. */
  active: boolean;
  /** 'in' descends to the resting view; 'out' climbs back to overhead. */
  direction: 'in' | 'out';
  /** Fired once the scene has everything it needs to be shown. */
  onReady?: () => void;
  /** Camera draw-back as the page scrolls towards the photos; see CountryScene. */
  recede?: RefObject<number>;
  className?: string;
  style?: CSSProperties;
}

/** Client-only host for the country's 3D scene. */
export default function CountryStage({
  d,
  centroid,
  model,
  active,
  direction,
  onReady,
  recede,
  className = '',
  style,
}: CountryStageProps) {
  const mounted = useMounted();
  const reducedMotion = useReducedMotion();

  if (!mounted) return <div className={className} style={style} aria-hidden="true" />;

  return (
    <div className={className} style={style}>
      <Suspense fallback={null}>
        <CountryScene
          d={d}
          centroid={centroid}
          model={model}
          reducedMotion={reducedMotion}
          active={active}
          direction={direction}
          onReady={onReady}
          recede={recede}
        />
      </Suspense>
    </div>
  );
}

export function preloadCountryScene() {
  void import('./CountryScene');
}
