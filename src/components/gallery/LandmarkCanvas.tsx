import { lazy, Suspense } from 'react';
import { useMounted } from '../../hooks/useMounted';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Deliberately dynamic: this module graph contains three.js, which must never
// be evaluated during SSR on the Worker.
const LandmarkScene = lazy(() => import('./LandmarkScene'));

export interface LandmarkCanvasProps {
  model: string;
  size: 'card' | 'panel';
  className?: string;
}

const SIZE_CLASS: Record<LandmarkCanvasProps['size'], string> = {
  card: 'h-56 w-full',
  panel: 'h-72 md:h-96 w-full',
};

/** Renders a landmark model, client-side only, with the scene code-split. */
export default function LandmarkCanvas({ model, size, className = '' }: LandmarkCanvasProps) {
  const mounted = useMounted();
  const reducedMotion = useReducedMotion();
  const wrapper = `${SIZE_CLASS[size]} ${className}`;

  if (!mounted) return <div className={wrapper} aria-hidden="true" />;

  return (
    <div className={wrapper}>
      <Suspense fallback={null}>
        <LandmarkScene model={model} autoRotate={!reducedMotion} />
      </Suspense>
    </div>
  );
}

export function preloadLandmark(model: string) {
  void import('./LandmarkModel').then((m) => m.preloadLandmark(model));
}
