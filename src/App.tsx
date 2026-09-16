import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router';
import HomePage from './pages/HomePage';
import ProjectDetailPage from './pages/ProjectDetailPage';

function ScrollToHash() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

export default function App() {
  return (
    <div className="bg-stone-50 text-stone-900 font-sans antialiased selection:bg-stone-300 selection:text-stone-900 min-h-screen">
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
      </Routes>
    </div>
  );
}
