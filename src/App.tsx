import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigationType } from 'react-router';
import HomePage from './pages/HomePage';
import ProjectDetailPage from './pages/ProjectDetailPage';

const LeetCodePage = lazy(() => import('./pages/LeetCodePage'));

function ScrollToHash() {
  const location = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType === 'POP') {
      return;
    }
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location, navigationType]);
  return null;
}

export default function App() {
  return (
    <div className="bg-stone-50 text-stone-900 font-sans antialiased selection:bg-stone-300 selection:text-stone-900 min-h-screen">
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route
          path="/leetcode"
          element={
            <Suspense fallback={<main className="max-w-4xl mx-auto px-6 md:px-12 min-h-screen" />}>
              <LeetCodePage />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}
