import { lazy, Suspense } from 'react';
import { useMounted } from '../../hooks/useMounted';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Dynamic: this module graph pulls in three.js, which must never be evaluated
// during SSR on the Worker (it drags in a second React copy).
const CountryScene = lazy(() => import('./CountryScene'));

export interface CountryStageProps {
  d: string;
  centroid: [number, number];
  model: string;
  className?: string;
}

/** Client-only host for the country's 3D scene. */
export default function CountryStage({ d, centroid, model, className = '' }: CountryStageProps) {
  const mounted = useMounted();
  const reducedMotion = useReducedMotion();
  const box = `h-[320px] md:h-[460px] w-full ${className}`;

  if (!mounted) return <div className={box} aria-hidden="true" />;

  return (
    <div className={box}>
      <Suspense fallback={null}>
        <CountryScene d={d} centroid={centroid} model={model} reducedMotion={reducedMotion} />
      </Suspense>
    </div>
  );
}

export function preloadCountryScene() {
  void import('./CountryScene');
}
