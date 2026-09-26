import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, useLocation, useNavigationType } from 'react-router';
import type { Route } from './+types/root';
import globalCss from './styles/global.css?inline';
import geistWoff2 from './assets/fonts/geist-latin-wght-normal.woff2?url';
import outfitWoff2 from './assets/fonts/outfit-latin-wght-normal.woff2?url';

/**
 * Sets the theme before the page paints, so dark mode doesn't flash light.
 * Uses the saved choice, otherwise the system setting.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

const TITLE = 'Hayden Huan - Backend Engineer & Infrastructure Developer';
const DESCRIPTION =
  'Portfolio of Hayden Huan Kee Jiun, a backend engineer working across Java, Python, Kubernetes, and event-driven infrastructure.';

export const meta: Route.MetaFunction = () => [{ title: TITLE }];

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/Profile.webp" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content="/Profile.webp" />
        <link rel="icon" type="image/png" sizes="128x128" href="/favicon.png" />
        <link rel="preload" href={geistWoff2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={outfitWoff2} as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Caveat is only used for gallery captions, so it stays on Google Fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&display=swap" rel="stylesheet" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body className="bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 font-sans antialiased selection:bg-stone-300 selection:text-stone-900 dark:selection:bg-stone-700 dark:selection:text-stone-50 min-h-screen">
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
