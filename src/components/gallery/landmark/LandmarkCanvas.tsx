import { lazy, Suspense } from 'react';
import { useMounted } from '@/hooks/useMounted';

// Loaded on demand: three.js must never run during server rendering.
const LandmarkScene = lazy(() => import('./LandmarkScene'));

export interface LandmarkCanvasProps {
  model: string;
  className?: string;
}

/** Shows a landmark model, in the browser only. */
export default function LandmarkCanvas({ model, className = '' }: LandmarkCanvasProps) {
  const mounted = useMounted();
  const wrapper = `h-44 w-32 ${className}`;

  if (!mounted) return <div className={wrapper} aria-hidden="true" />;

  return (
    <div className={wrapper}>
      <Suspense fallback={null}>
        <LandmarkScene model={model} />
      </Suspense>
    </div>
  );
}

export function preloadLandmark(model: string) {
  void import('./useLandmark').then((m) => m.preloadLandmark(model));
}
