# React SPA Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faithfully port the Astro portfolio at `/home/hayden/personal-website/website` to a standalone React SPA in `/home/hayden/personalWebsite_redo`.

**Architecture:** Vite + React 19 SPA with React Router (`/` and `/projects/:slug`). Each Astro component becomes a `.tsx` component; each Astro inline `<script>` becomes a `useEffect` with cleanup. LeetCode stats fetched by a prebuild script into a committed JSON snapshot.

**Tech Stack:** Vite, React 19, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), React Router v7 (`react-router` package), GSAP + ScrollTrigger, lucide-react, Bun.

**Spec:** `docs/superpowers/specs/2026-09-16-react-spa-port-design.md`

## Global Constraints

- Package manager: **bun** (`bun install`, `bun run …`). Working dir: `/home/hayden/personalWebsite_redo`.
- Source Astro site at `/home/hayden/personal-website/website` is **read-only reference** — never modify it.
- Visual output must match the Astro site: same Tailwind classes, same copy, same animations. When porting markup, copy the class strings verbatim (only `class=` → `className=`, `class:list` → template strings).
- TypeScript strict; `tsc --noEmit` must pass as part of `bun run build`.
- Fonts: Inter (body, `--font-sans`) + Outfit (headings, `--font-heading` → `font-heading` utility), loaded from Google Fonts in `index.html`.
- Devicon CSS loaded from `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css` in `index.html`.
- There is no unit-test framework in this project; the test cycle per task is: `bun run build` passes + the dev server renders the deliverable without console errors.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/vite-env.d.ts`, `src/styles/global.css`, `src/main.tsx`, `src/App.tsx`
- Copy: `public/` assets from the Astro site

**Interfaces:**
- Produces: `src/App.tsx` exporting default `App` with a `<Routes>` block that later tasks extend; `ScrollToHash` behavior; alias-free relative imports throughout.

- [ ] **Step 1: Write config files**

`package.json`:

```json
{
  "name": "personal-website",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "bun scripts/fetch-leetcode.ts && tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "gsap": "^3.15.0",
    "lucide-react": "^0.544.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router": "^7.9.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.0",
    "tailwindcss": "^4.2.0",
    "typescript": "^5.9.0",
    "vite": "^7.1.0"
  }
}
```

(Note: `scripts/fetch-leetcode.ts` arrives in Task 2; until then create it as a stub in this task — see Step 2.)

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`.gitignore`:

```
node_modules
dist
*.local
.DS_Store
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
    />
    <title>Hayden Huan — Backend Engineer & Infrastructure Developer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/styles/global.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', sans-serif;
  --font-heading: 'Outfit', sans-serif;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

`src/App.tsx` (placeholder home; real pages arrive in later tasks):

```tsx
import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router';

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
        <Route path="/" element={<p className="p-8">Home placeholder</p>} />
      </Routes>
    </div>
  );
}
```

Note: the Astro site put the body classes on `<body>`; here they live on the app root div — same rendered result.

- [ ] **Step 2: Stub the prebuild script and copy public assets**

```bash
mkdir -p scripts public
printf '// populated in Task 2\nexport {};\n' > scripts/fetch-leetcode.ts
cp /home/hayden/personal-website/website/public/Profile.webp \
   /home/hayden/personal-website/website/public/pointingFlower.jpeg \
   /home/hayden/personal-website/website/public/Architecture.svg \
   /home/hayden/personal-website/website/public/favicon.svg \
   /home/hayden/personal-website/website/public/favicon.ico \
   public/
```

(Do NOT copy `finguardmy-architecture.excalidraw` — it's a source file, not a served asset.)

- [ ] **Step 3: Install and verify build**

```bash
bun install
bun run build
```

Expected: build succeeds, `dist/` produced.

- [ ] **Step 4: Verify dev render**

Run `bun run dev` in background; `curl -s http://localhost:5173/ | grep root` returns the root div. Open/screenshot if browser tooling available: page shows "Home placeholder" on stone-50 background. Stop server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind v4 project"
```

---

### Task 2: Data layer and LeetCode prebuild script

**Files:**
- Copy: `src/data/projects.ts`, `src/utils/techIcons.ts`, `src/styles/journey.css` (verbatim from Astro site)
- Create: `src/data/leetcode.json`, `scripts/fetch-leetcode.ts` (replace stub)

**Interfaces:**
- Produces: `projects: Project[]`, `getProjectBySlug(slug: string): Project | undefined` from `src/data/projects` (Project has `slug, title, inProgress?, description, tech, highlights, content`); `techIconMap: Record<string, string>` from `src/utils/techIcons`; `src/data/leetcode.json` with shape `{ totalSolved: number|null, easySolved: number|null, mediumSolved: number|null, hardSolved: number|null }`.

- [ ] **Step 1: Copy source files verbatim**

```bash
mkdir -p src/data src/utils
cp /home/hayden/personal-website/website/src/data/projects.ts src/data/projects.ts
cp /home/hayden/personal-website/website/src/utils/techIcons.ts src/utils/techIcons.ts
cp /home/hayden/personal-website/website/src/styles/journey.css src/styles/journey.css
```

- [ ] **Step 2: Create the stats snapshot placeholder**

`src/data/leetcode.json`:

```json
{
  "totalSolved": null,
  "easySolved": null,
  "mediumSolved": null,
  "hardSolved": null
}
```

- [ ] **Step 3: Write the fetch script (replaces stub)**

`scripts/fetch-leetcode.ts`:

```ts
/**
 * Prebuild step: fetch LeetCode solved-problem counts and snapshot them
 * into src/data/leetcode.json. On any failure the existing snapshot is
 * left untouched so the build never breaks on a flaky external API.
 */
const USERNAME = 'teomeehua';
const OUT = new URL('../src/data/leetcode.json', import.meta.url).pathname;

interface Stats {
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query userProblemsSolved($username: String!) {
            matchedUser(username: $username) {
              submitStatsGlobal {
                acSubmissionNum { difficulty count }
              }
            }
          }
        `,
        variables: { username: USERNAME },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const counts: { difficulty: string; count: number }[] | undefined =
      json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
    if (!counts) return null;
    const find = (d: string) => counts.find((c) => c.difficulty === d)?.count ?? 0;
    return {
      totalSolved: find('All'),
      easySolved: find('Easy'),
      mediumSolved: find('Medium'),
      hardSolved: find('Hard'),
    };
  } catch {
    return null;
  }
}

const stats = await fetchStats();
if (stats) {
  await Bun.write(OUT, JSON.stringify(stats, null, 2) + '\n');
  console.log(`LeetCode stats updated: ${stats.totalSolved} solved`);
} else {
  console.warn('LeetCode fetch failed — keeping existing snapshot');
}
```

- [ ] **Step 4: Verify**

```bash
bun scripts/fetch-leetcode.ts
cat src/data/leetcode.json
bun run build
```

Expected: script prints either "stats updated" (JSON now has numbers) or the fallback warning (JSON unchanged); build passes either way.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project data, tech icons, and LeetCode prebuild snapshot"
```

---

### Task 3: Shared components — SectionHeader, Footer, Navbar

**Files:**
- Create: `src/components/SectionHeader.tsx`, `src/components/Footer.tsx`, `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SectionHeader({ title, subtitle, headerRef? }: { title: string; subtitle: string; headerRef?: React.Ref<HTMLDivElement> })`; `Footer()`; `Navbar()`. All default exports.

- [ ] **Step 1: Write SectionHeader**

`src/components/SectionHeader.tsx`:

```tsx
import type { Ref } from 'react';

interface Props {
  title: string;
  subtitle: string;
  headerRef?: Ref<HTMLDivElement>;
}

export default function SectionHeader({ title, subtitle, headerRef }: Props) {
  return (
    <div ref={headerRef} data-section-header="">
      <h2 className="text-3xl font-heading font-semibold text-stone-900 mb-2">{title}</h2>
      <p className="text-stone-500 font-light">{subtitle}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write Footer**

`src/components/Footer.tsx`:

```tsx
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-stone-900 text-stone-400 py-12 text-center text-sm font-light">
      <p>© {year} Hayden Huan Kee Jiun. All rights reserved.</p>
    </footer>
  );
}
```

- [ ] **Step 3: Write Navbar**

Port of `Navbar.astro`: sticky centered nav with a GSAP-driven underline indicator that follows the active section via ScrollTrigger. Links use React Router `Link` with hash paths so they work from `/projects/:slug` too.

`src/components/Navbar.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SECTIONS = ['about', 'skills', 'leetcode', 'projects', 'journey'] as const;
const LABELS: Record<(typeof SECTIONS)[number], string> = {
  about: 'About',
  skills: 'Skills',
  leetcode: 'LeetCode',
  projects: 'Projects',
  journey: 'Journey',
};

export default function Navbar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const container = containerRef.current;
    if (!indicator || !container) return;

    function moveIndicatorTo(link: HTMLElement) {
      gsap.to(indicator, {
        x: link.offsetLeft,
        width: link.offsetWidth,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    const triggers: ScrollTrigger[] = [];
    SECTIONS.forEach((id) => {
      const section = document.getElementById(id);
      const link = container.querySelector<HTMLElement>(`[data-nav-link="${id}"]`);
      if (!section || !link) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => moveIndicatorTo(link),
          onEnterBack: () => moveIndicatorTo(link),
        })
      );
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <nav className="max-w-5xl mx-auto px-6 md:px-12 py-8 flex justify-center items-center bg-stone-50/80 backdrop-blur-sm sticky top-0 z-50">
      <div ref={containerRef} className="relative flex gap-6 text-sm font-medium text-stone-600 pb-1">
        {SECTIONS.map((id) => (
          <Link
            key={id}
            to={`/#${id}`}
            data-nav-link={id}
            className="hover:text-stone-900 transition-colors"
          >
            {LABELS[id]}
          </Link>
        ))}
        <span
          ref={indicatorRef}
          className="absolute bottom-0 left-0 h-[2px] bg-stone-900 rounded-full pointer-events-none"
          style={{ width: 0, opacity: 0 }}
        />
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Verify**

`bun run build` passes (components compile; they aren't routed yet).

- [ ] **Step 5: Commit**

```bash
git add src/components
git commit -m "feat: add SectionHeader, Footer, and Navbar components"
```

---

### Task 4: Hero — PixelTransition and HeroSection

**Files:**
- Create: `src/components/PixelTransition.tsx`, `src/components/HeroSection.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `PixelTransition({ firstImage, secondImage, gridSize?, pixelColor?, animationStepDuration?, className? })`; `HeroSection()` rendering `<section id="about">`. Default exports.

- [ ] **Step 1: Write PixelTransition**

Direct port of the canvas hover/click pixel-swap. All imperative logic lives in one `useEffect`; cleanup clears timeouts and listeners. Styles from the Astro `<style>` block become inline styles/Tailwind on the JSX.

`src/components/PixelTransition.tsx`:

```tsx
import { useEffect, useRef } from 'react';

interface Props {
  firstImage: string;
  secondImage: string;
  gridSize?: number;
  pixelColor?: string;
  animationStepDuration?: number;
  className?: string;
}

export default function PixelTransition({
  firstImage,
  secondImage,
  gridSize = 9,
  pixelColor = '#1c1917',
  animationStepDuration = 1200,
  className = '',
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstRef = useRef<HTMLImageElement>(null);
  const secondRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    const canvas = canvasRef.current;
    const imgFirst = firstRef.current;
    const imgSecond = secondRef.current;
    if (!wrapper || !inner || !canvas || !imgFirst || !imgSecond) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function syncCanvasSize() {
      canvas!.width = inner!.offsetWidth;
      canvas!.height = inner!.offsetHeight;
    }
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const total = gridSize * gridSize;
    const cellState = new Uint8Array(total); // 0 = hidden, 1 = visible

    function drawPixels() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const cw = canvas!.width / gridSize;
      const ch = canvas!.height / gridSize;
      ctx!.fillStyle = pixelColor;
      for (let i = 0; i < total; i++) {
        if (cellState[i] === 1) {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          ctx!.fillRect(col * cw, row * ch, cw, ch);
        }
      }
    }

    const shuffle = () => [...Array(total).keys()].sort(() => Math.random() - 0.5);

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let isActive = false;

    function clearAll() {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      cellState.fill(0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    }

    function animate(goingIn: boolean) {
      clearAll();
      const STEPS = 12;
      const half = animationStepDuration / 2;
      const stepDelay = half / STEPS;
      const batchSize = Math.ceil(total / STEPS);
      const order1 = shuffle();
      const order2 = shuffle();

      for (let s = 0; s < STEPS; s++) {
        const batch = order1.slice(s * batchSize, (s + 1) * batchSize);
        timeouts.push(setTimeout(() => {
          batch.forEach((i) => { cellState[i] = 1; });
          drawPixels();
        }, s * stepDelay));
      }

      timeouts.push(setTimeout(() => {
        if (goingIn) {
          imgFirst!.style.opacity = '0';
          imgSecond!.style.opacity = '1';
        } else {
          imgSecond!.style.opacity = '0';
          imgFirst!.style.opacity = '1';
        }
      }, half));

      for (let s = 0; s < STEPS; s++) {
        const batch = order2.slice(s * batchSize, (s + 1) * batchSize);
        timeouts.push(setTimeout(() => {
          batch.forEach((i) => { cellState[i] = 0; });
          drawPixels();
        }, half + s * stepDelay));
      }
    }

    function handleEnter() {
      if (!isActive) { isActive = true; animate(true); }
    }
    function handleLeave() {
      if (isActive) { isActive = false; animate(false); }
    }
    function handleClick() {
      isActive ? handleLeave() : handleEnter();
    }

    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (!isTouch) {
      wrapper.addEventListener('mouseenter', handleEnter);
      wrapper.addEventListener('mouseleave', handleLeave);
    } else {
      wrapper.addEventListener('click', handleClick);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', syncCanvasSize);
      wrapper.removeEventListener('mouseenter', handleEnter);
      wrapper.removeEventListener('mouseleave', handleLeave);
      wrapper.removeEventListener('click', handleClick);
    };
  }, [gridSize, pixelColor, animationStepDuration]);

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div ref={wrapperRef} className={`w-full cursor-pointer rounded-2xl ${className}`}>
      <div
        ref={innerRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: '3 / 4', boxShadow: '0 0 0 1px #e7e5e4' }}
      >
        <img ref={firstRef} src={firstImage} alt="Profile" draggable={false} style={imgStyle} />
        <img ref={secondRef} src={secondImage} alt="Profile alternate" draggable={false} style={{ ...imgStyle, opacity: 0 }} />
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write HeroSection**

Port of `HeroSection.astro`: intro GSAP timeline (nav → label → scrambled name → bio → buttons + image). The scramble manipulates the `h1` DOM directly via ref — safe because React never re-renders that static text. Timeline cleanup kills GSAP and scramble timers.

`src/components/HeroSection.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Mail, Github, Instagram } from 'lucide-react';
import PixelTransition from './PixelTransition';

const HERO_NAME = 'Hayden Huan Kee Jiun';

function scramble(el: HTMLElement, totalDuration = 900): () => void {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const TICK = 45;
  const finalText = el.dataset.text ?? el.textContent ?? '';

  el.innerHTML = '';
  const items: { span: HTMLSpanElement; final: string }[] = [];

  for (const char of finalText) {
    if (char === ' ') {
      el.appendChild(document.createTextNode(' '));
    } else {
      const span = document.createElement('span');
      span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      el.appendChild(span);
      items.push({ span, final: char });
    }
  }

  const intervals = items.map(({ span }) =>
    setInterval(() => {
      span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
    }, TICK)
  );

  const step = totalDuration / items.length;
  const timeouts = items.map(({ span, final }, i) =>
    setTimeout(() => {
      clearInterval(intervals[i]);
      span.textContent = final;
    }, step * (i + 1))
  );

  return () => {
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    el.textContent = finalText;
  };
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const nameEl = nameRef.current;
    if (!section || !nameEl) return;

    const label = section.querySelector<HTMLElement>('[data-hero-label]');
    const bio = section.querySelector<HTMLElement>('[data-hero-bio]');
    const btns = Array.from(section.querySelectorAll<HTMLElement>('[data-hero-btn]'));
    const image = section.querySelector<HTMLElement>('[data-hero-image]');
    const nav = document.querySelector<HTMLElement>('nav');

    let cancelScramble: (() => void) | undefined;

    gsap.set([nav, label, bio, image], { opacity: 0 });
    gsap.set(nav, { y: -20 });
    gsap.set([label, bio], { y: 16 });
    gsap.set(btns, { opacity: 0, y: 16 });
    gsap.set(image, { y: 20 });
    gsap.set(nameEl, { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl
      .to(nav, { opacity: 1, y: 0, duration: 0.4 })
      .to(label, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
      .add(() => {
        gsap.set(nameEl, { opacity: 1 });
        cancelScramble = scramble(nameEl, 900);
      })
      .to(bio, { opacity: 1, y: 0, duration: 0.4 }, '+=0.35')
      .to(btns, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, '-=0.2')
      .to(image, { opacity: 1, y: 0, duration: 0.5 }, '<');

    return () => {
      tl.kill();
      cancelScramble?.();
      gsap.set([nav, label, bio, image, nameEl, ...btns], { clearProps: 'all' });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="pt-20 pb-32 lg:pt-32 lg:pb-40 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] items-center gap-12 lg:gap-16"
    >
      <div className="min-w-0">
        <p data-hero-label className="text-stone-500 font-medium tracking-wide text-sm uppercase mb-4">
          Backend Engineer
        </p>
        <h1
          ref={nameRef}
          data-text={HERO_NAME}
          className="text-4xl sm:text-5xl lg:text-6xl font-heading font-semibold tracking-tight text-stone-900 mb-6 leading-[1.1] break-words"
        >
          {HERO_NAME}
        </h1>
        <p data-hero-bio className="text-lg text-stone-600 leading-relaxed font-light mb-10">
          I am a rookie backend developer who enjoys trying new technologies instead of using one tech only. I am passionate about growing my skills and understanding how backend logic connects with reliable infrastructure.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            data-hero-btn
            href="#projects"
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            View Projects <ArrowRight size={16} />
          </a>
          <a
            data-hero-btn
            href="mailto:teomeehua@gmail.com"
            className="flex items-center gap-2 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
          >
            <Mail size={16} /> Contact Me
          </a>
          <div data-hero-btn className="flex items-center gap-3 ml-2 border-l border-stone-300 pl-6">
            <a href="https://github.com/HaydenHuan03" className="text-stone-500 hover:text-stone-900 transition-colors">
              <Github size={20} />
            </a>
            <a
              href="https://www.instagram.com/hayden_1729/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-900 transition-colors"
            >
              <Instagram size={20} />
            </a>
          </div>
        </div>
      </div>

      <div data-hero-image className="w-full max-w-[380px] mx-auto lg:mx-0 lg:w-[380px]">
        <PixelTransition
          firstImage="/Profile.webp"
          secondImage="/pointingFlower.jpeg"
          gridSize={14}
          pixelColor="#1c1917"
          animationStepDuration={800}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

`bun run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: add HeroSection with GSAP intro and PixelTransition"
```

---

### Task 5: SkillsSection and LeetCodeSection

**Files:**
- Create: `src/components/SkillsSection.tsx`, `src/components/LeetCodeSection.tsx`

**Interfaces:**
- Consumes: `SectionHeader` (Task 3), `techIconMap` (Task 2), `src/data/leetcode.json` (Task 2).
- Produces: `SkillsSection()` rendering `<section id="skills">`; `LeetCodeSection()` rendering `<section id="leetcode">`. Default exports.

- [ ] **Step 1: Write SkillsSection**

`src/components/SkillsSection.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Server, Layers, Share2, Database } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { techIconMap } from '../utils/techIcons';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { title: 'Backend & APIs', Icon: Server, skills: ['Java (Spring Boot)', 'Python', 'FastAPI'] },
  { title: 'Infrastructure', Icon: Layers, skills: ['Kubernetes', 'Docker', 'Nginx', 'Caddy'] },
  { title: 'Data & Events', Icon: Share2, skills: ['Apache Kafka', 'Apache Airflow', 'Apache Spark', 'Valkey'] },
  { title: 'Databases', Icon: Database, skills: ['PostgreSQL', 'MySQL', 'Redis', 'Pinecone'] },
];

export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-skill-card]'));
    const badges = Array.from(section.querySelectorAll<HTMLElement>('[data-skill-badge]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(cards, { opacity: 0, y: 40 });
    gsap.set(badges, { opacity: 0, scale: 0.9 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.timeline({ defaults: { ease: 'power2.out' } })
          .to(header, { opacity: 1, y: 0, duration: 0.4 })
          .to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, '-=0.1')
          .to(badges, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04 }, '-=0.3');
      },
    });

    return () => {
      trigger.kill();
      gsap.set([header, ...cards, ...badges], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="skills" className="py-24 border-t border-stone-200">
      <SectionHeader title="Tech Skills" subtitle="Core competencies and technologies." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {categories.map((cat) => (
          <div
            key={cat.title}
            data-skill-card
            className="p-8 border border-stone-200 rounded-xl bg-white hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-stone-100 rounded-lg">
                <cat.Icon size={20} className="text-stone-700" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{cat.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.skills.map((skill) => {
                const iconClass = techIconMap[skill];
                return (
                  <span
                    key={skill}
                    data-skill-badge
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-md font-medium"
                  >
                    {iconClass && <i className={`${iconClass} text-base leading-none`} />}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write LeetCodeSection**

`src/components/LeetCodeSection.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExternalLink } from 'lucide-react';
import SectionHeader from './SectionHeader';
import statsJson from '../data/leetcode.json';

gsap.registerPlugin(ScrollTrigger);

interface LeetCodeStats {
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
}
const stats = statsJson as LeetCodeStats;

const LEETCODE_USERNAME = 'teomeehua';
const hasStats = stats.totalSolved !== null;

export default function LeetCodeSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-lc-card]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(cards, { opacity: 0, y: 40 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.timeline({ defaults: { ease: 'power2.out' } })
          .to(header, { opacity: 1, y: 0, duration: 0.4 })
          .to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, '-=0.1');
      },
    });

    return () => {
      trigger.kill();
      gsap.set([header, ...cards], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="leetcode" className="py-24 border-t border-stone-200">
      <SectionHeader title="LeetCode" subtitle="Problem-solving practice, tracked at each deploy." />

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 mt-12 items-stretch">
        <div data-lc-card className="p-8 border border-stone-200 rounded-xl bg-white flex flex-col items-center justify-center gap-2 md:w-56">
          <span className="text-5xl font-heading font-semibold text-stone-900">{stats.totalSolved ?? '—'}</span>
          <span className="text-stone-500 text-sm uppercase tracking-wide">Problems Solved</span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-emerald-600">Easy</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.easySolved ?? '—'}</span>
          </div>
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-amber-600">Medium</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.mediumSolved ?? '—'}</span>
          </div>
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-rose-600">Hard</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.hardSolved ?? '—'}</span>
          </div>
        </div>
      </div>

      {!hasStats && (
        <p className="mt-4 text-sm text-stone-500">
          Stats temporarily unavailable — check the profile directly below.
        </p>
      )}

      <a
        href={`https://leetcode.com/u/${LEETCODE_USERNAME}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-8 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
      >
        View Profile <ExternalLink size={16} />
      </a>
    </section>
  );
}
```

Note: the `statsJson as LeetCodeStats` cast keeps the type stable regardless of whether the committed snapshot currently holds `null`s or numbers (with `resolveJsonModule`, TS would otherwise infer the type from the file's literal contents).

- [ ] **Step 3: Verify**

`bun run build` passes.

- [ ] **Step 4: Commit**

```bash
git add src/components
git commit -m "feat: add Skills and LeetCode sections"
```

---

### Task 6: ProjectsSection, JourneySection, pages, and routing

**Files:**
- Create: `src/components/ProjectsSection.tsx`, `src/components/JourneySection.tsx`, `src/pages/HomePage.tsx`, `src/pages/ProjectDetailPage.tsx`
- Modify: `src/App.tsx` (replace placeholder routes)

**Interfaces:**
- Consumes: `projects`, `getProjectBySlug`, `Project` type (Task 2); `techIconMap` (Task 2); `SectionHeader`, `Navbar`, `Footer` (Task 3); `HeroSection` (Task 4); `SkillsSection`, `LeetCodeSection` (Task 5); `src/styles/journey.css` (Task 2).
- Produces: complete routed site.

- [ ] **Step 1: Write ProjectsSection**

`src/components/ProjectsSection.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { projects } from '../data/projects';
import { techIconMap } from '../utils/techIcons';

gsap.registerPlugin(ScrollTrigger);

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-project-row]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(rows, { opacity: 0, x: -32, y: 16 });

    const triggers: ScrollTrigger[] = [
      ScrollTrigger.create({
        trigger: header,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(header, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        },
      }),
      ...rows.map((row) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(row, { opacity: 1, x: 0, y: 0, duration: 0.55, ease: 'power2.out' });
          },
        })
      ),
    ];

    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set([header, ...rows], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="projects" className="py-24 border-t border-stone-200">
      <SectionHeader title="Selected Work" subtitle="Architectural highlights and engineering challenges." />

      <div className="space-y-4 mt-12">
        {projects.map((project) => (
          <Link
            key={project.slug}
            data-project-row
            to={`/projects/${project.slug}`}
            className="group flex flex-col md:flex-row gap-8 items-start p-8 rounded-xl cursor-pointer bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all no-underline"
          >
            <div className="md:w-1/3 flex-shrink-0">
              <h3 className="font-heading font-semibold text-xl mb-3 group-hover:text-stone-900 text-stone-800">
                {project.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tech.map((t) => {
                  const iconClass = techIconMap[t];
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded border border-stone-200"
                    >
                      {iconClass && <i className={`${iconClass} text-sm leading-none`} />}
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="md:w-2/3">
              <p className="text-stone-600 mb-4 font-light leading-relaxed">{project.description}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-stone-900 group-hover:text-stone-600 transition-colors mt-6">
                Read full case study
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write JourneySection**

`src/components/JourneySection.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import SectionHeader from './SectionHeader';
import '../styles/journey.css';

const experiences = [
  {
    date: 'August 2025 – Feb 2026',
    title: 'Backend Engineer Internship',
    role: 'DevOps & Backend Engineer Intern',
    description:
      'Built and maintained backend services in Java, deploying and operating applications on Kubernetes in both local and production environments.',
  },
  {
    date: 'Oct 2022 - Oct 2026',
    title: 'University Teknologi Malaysia (UTM)',
    role: 'Cyber and Network Security Student',
    description:
      'Learning main network security concept with cisco netacad, also looking skills on software engineering since network is too hard',
  },
];

export default function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const items = section.querySelectorAll('[data-orbit]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="journey" className="py-24 border-t border-stone-200">
      <SectionHeader title="The Journey" subtitle="Experience, education, and continuous learning." />

      <div className="orbit-timeline">
        <div className="orbit-axis" aria-hidden="true" />

        {experiences.map((exp, i) => (
          <div key={exp.title} className={`orbit-row ${i % 2 === 0 ? 'is-left' : 'is-right'}`} data-orbit>
            <div className="orbit-node" aria-hidden="true">
              <div className="node-ring" />
              <div className="node-dot" />
              <div className="node-sat"><span /></div>
            </div>

            <div className="orbit-card-wrap">
              <div className="orbit-card">
                <span className="orbit-date">{exp.date}</span>
                <h3 className="orbit-title">{exp.title}</h3>
                <p className="orbit-role">{exp.role}</p>
                <p className="orbit-desc">{exp.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write the pages**

`src/pages/HomePage.tsx`:

```tsx
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import SkillsSection from '../components/SkillsSection';
import LeetCodeSection from '../components/LeetCodeSection';
import ProjectsSection from '../components/ProjectsSection';
import JourneySection from '../components/JourneySection';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <HeroSection />
        <SkillsSection />
        <LeetCodeSection />
        <ProjectsSection />
        <JourneySection />
      </main>
      <Footer />
    </>
  );
}
```

`src/pages/ProjectDetailPage.tsx`:

```tsx
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getProjectBySlug } from '../data/projects';
import { techIconMap } from '../utils/techIcons';

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  useEffect(() => {
    if (project) document.title = `${project.title} — Hayden Huan`;
    return () => {
      document.title = 'Hayden Huan — Backend Engineer & Infrastructure Developer';
    };
  }, [project]);

  if (!project) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20 text-center">
          <h1 className="text-3xl font-heading font-semibold text-stone-900 mb-4">Project not found</h1>
          <Link to="/" className="text-stone-600 hover:text-stone-900 underline">Return to portfolio</Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
        <article className="animate-[fadeInUp_0.5s_ease-out]">
          <Link
            to="/"
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-12 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Previous Page
          </Link>

          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-4 leading-[1.1]">
              {project.title}
            </h1>
            {project.inProgress && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                In Progress
              </span>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {project.tech.map((t) => {
                const iconClass = techIconMap[t];
                return (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-md font-medium border border-stone-200"
                  >
                    {iconClass && <i className={`${iconClass} text-base leading-none`} />}
                    {t}
                  </span>
                );
              })}
            </div>
            <p className="text-xl text-stone-600 font-light leading-relaxed">{project.description}</p>
          </div>

          <div className="mb-16">
            {project.content.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-stone-700 leading-relaxed mb-6 font-light text-lg">
                {paragraph}
              </p>
            ))}
          </div>

          {project.slug === 'finguardmy' && (
            <div className="mb-16">
              <h3 className="font-heading font-semibold text-lg text-stone-900 mb-4">System Architecture</h3>
              <img
                src="/Architecture.svg"
                alt="FinGuardMY system architecture diagram"
                className="w-full rounded-xl border border-stone-200"
              />
            </div>
          )}

          <div className="p-8 bg-stone-100 rounded-xl border border-stone-200">
            <h3 className="font-heading font-semibold text-lg mb-4 text-stone-900">
              Key Architectural Highlights
            </h3>
            <ul className="space-y-4">
              {project.highlights.map((highlight) => (
                <li key={highlight.slice(0, 40)} className="flex gap-4 text-stone-700">
                  <span className="text-stone-400 mt-1">▹</span>
                  <span className="leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 pt-8 border-t border-stone-200 flex justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
            >
              Return to Portfolio
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
```

The `fadeInUp` keyframes for the arbitrary `animate-[fadeInUp_0.5s_ease-out]` class must be defined once in `src/styles/global.css` — append:

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 4: Wire routes in App.tsx**

Replace the placeholder `<Routes>` in `src/App.tsx`:

```tsx
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
```

- [ ] **Step 5: Verify build and render**

```bash
bun run build
```

Then run `bun run dev` in background and verify:
- `http://localhost:5173/` — hero animates in, nav indicator follows scroll, all five sections render
- `http://localhost:5173/projects/finguardmy` — detail page with In Progress badge and architecture image
- `http://localhost:5173/projects/automated-infrastructure-tooling` — detail page
- `http://localhost:5173/projects/nonexistent` — not-found message

Screenshot pages if browser tooling is available; otherwise check for console errors via the dev server output. Stop server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add projects, journey, detail pages, and routing"
```

---

### Task 7: Final verification and parity check

**Files:** none created — verification only (fix anything found, committing fixes individually).

- [ ] **Step 1: Full clean build**

```bash
rm -rf dist && bun run build
```

Expected: LeetCode script runs, `tsc --noEmit` clean, Vite build succeeds.

- [ ] **Step 2: Preview production build**

```bash
bun run preview
```

Verify `/` and `/projects/finguardmy` render on the preview server. Note: `vite preview` handles SPA fallback automatically.

- [ ] **Step 3: Parity checklist against the Astro site**

Confirm each item (visually or via DOM inspection):
- Hero: label → scrambled name → bio → buttons → image animate in sequence; pixel transition swaps Profile.webp ↔ pointingFlower.jpeg on hover
- Navbar: sticky, blurred, underline indicator moves as you scroll through the 5 sections
- Skills: 4 cards, devicon icons visible on badges, scroll-reveal fires once
- LeetCode: numbers or "—" shown; profile link works
- Projects: 2 rows slide in; clicking navigates to detail without full reload
- Detail pages: back links work and land at top of home; "View Projects" hero button scrolls to #projects
- Journey: orbit timeline reveals left/right cards on scroll
- Footer year is current

- [ ] **Step 4: Fix any parity gaps found, then final commit**

```bash
git add -A
git commit -m "chore: final parity fixes and verification"
```

(Skip the commit if the working tree is clean.)
