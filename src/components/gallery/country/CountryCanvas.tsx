import { lazy, Suspense, type CSSProperties, type RefObject } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Loaded on demand: three.js must never run during server rendering.
const CountryScene = lazy(() => import('./CountryScene'));

export interface CountryCanvasProps {
  d: string;
  centroid: [number, number];
  model: string;
  /** Whether the camera is moving. */
  active: boolean;
  /** 'in' moves the camera down to rest; 'out' moves it back up. */
  direction: 'in' | 'out';
  /** Called once the scene has loaded. */
  onReady?: () => void;
  /** How far the camera pulls back as the page scrolls to the photos. */
  recede?: RefObject<number>;
  className?: string;
  style?: CSSProperties;
}

/** Shows the country's 3D scene, in the browser only. */
export default function CountryCanvas({
  d,
  centroid,
  model,
  active,
  direction,
  onReady,
  recede,
  className = '',
  style,
}: CountryCanvasProps) {
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
