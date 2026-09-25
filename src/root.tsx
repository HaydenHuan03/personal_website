import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, useLocation, useNavigationType } from 'react-router';
import './styles/global.css';

/**
 * Applies the theme before first paint, so a dark-mode visitor never sees a
 * flash of the light page. Runs inline in <head>, ahead of hydration: the
 * saved choice wins, otherwise the system setting.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

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
        <meta name="viewport" content="width=device-width" />
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
        <link rel="icon" type="image/png" href="/image.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Outfit:wght@400;500;600;700&family=Caveat:wght@500&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css" />
        <title>Hayden Huan - Backend Engineer & Infrastructure Developer</title>
        <Meta />
        <Links />
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
