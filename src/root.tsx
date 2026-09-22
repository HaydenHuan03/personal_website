import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, useLocation, useNavigationType } from 'react-router';
import globalCss from './styles/global.css?inline';
import geistWoff2 from './assets/fonts/geist-latin-wght-normal.woff2?url';
import outfitWoff2 from './assets/fonts/outfit-latin-wght-normal.woff2?url';

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

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Portfolio of Hayden Huan Kee Jiun, a backend engineer working across Java, Python, Kubernetes, and event-driven infrastructure."
        />
        <meta property="og:title" content="Hayden Huan - Backend Engineer & Infrastructure Developer" />
        <meta
          property="og:description"
          content="Portfolio of Hayden Huan Kee Jiun, a backend engineer working across Java, Python, Kubernetes, and event-driven infrastructure."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Profile.webp" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Hayden Huan - Backend Engineer & Infrastructure Developer" />
        <meta
          name="twitter:description"
          content="Portfolio of Hayden Huan Kee Jiun, a backend engineer working across Java, Python, Kubernetes, and event-driven infrastructure."
        />
        <meta name="twitter:image" content="/Profile.webp" />
        <link rel="icon" type="image/png" sizes="128x128" href="/favicon.png" />
        <link rel="preload" href={geistWoff2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={outfitWoff2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <title>Hayden Huan - Backend Engineer & Infrastructure Developer</title>
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body className="bg-stone-50 text-stone-900 font-sans antialiased selection:bg-stone-300 selection:text-stone-900 min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="grain-overlay" aria-hidden="true" />
      <ScrollToHash />
      <Outlet />
    </>
  );
}
