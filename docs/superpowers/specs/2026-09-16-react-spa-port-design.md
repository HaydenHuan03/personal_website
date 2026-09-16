# React SPA Port of Personal Portfolio — Design Spec

**Date:** 2026-09-16
**Source:** Astro site at `/home/hayden/personal-website/website` (reference only; not modified)
**Target:** Fresh React SPA in `/home/hayden/personalWebsite_redo`

## Goal

Faithfully port the existing Astro portfolio to a standalone React single-page
application. Same content, same visual design, same animations. No Astro.

## Stack

- **Build:** Vite (latest), Bun as package manager
- **UI:** React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config.js`;
  theme in `src/styles/global.css` with `--font-sans: Inter`,
  `--font-heading: Outfit`)
- **Routing:** React Router — routes `/` (home) and `/projects/:slug` (detail)
- **Animation:** GSAP + ScrollTrigger (ported from the Astro inline scripts)
- **Icons:** `lucide-react` components (replaces hand-rolled `Icon.astro`);
  Devicon CSS from CDN for tech badges

## Project structure

```
index.html                  # fonts (Inter, Outfit) + devicon CSS links, #root
scripts/fetch-leetcode.ts   # prebuild: fetch stats → src/data/leetcode.json
public/                     # Profile.webp, pointingFlower.jpeg, Architecture.svg, favicons
src/
  main.tsx                  # ReactDOM + RouterProvider
  App.tsx                   # routes + scroll-to-hash handling
  data/projects.ts          # copied verbatim from Astro site
  data/leetcode.json        # committed snapshot of LeetCode stats
  utils/techIcons.ts        # copied verbatim
  styles/global.css         # Tailwind v4 import + @theme fonts
  styles/journey.css        # copied verbatim (orbit timeline)
  pages/HomePage.tsx        # Navbar + Hero + Skills + LeetCode + Projects + Journey + Footer
  pages/ProjectDetailPage.tsx
  components/Navbar.tsx     # sticky nav, GSAP indicator follows scroll sections
  components/HeroSection.tsx      # GSAP intro timeline + name scramble effect
  components/PixelTransition.tsx  # canvas pixel swap between two profile images
  components/SkillsSection.tsx    # 4 category cards, ScrollTrigger reveal
  components/LeetCodeSection.tsx  # stat cards from leetcode.json
  components/ProjectsSection.tsx  # project rows linking to detail pages
  components/JourneySection.tsx   # orbit timeline, IntersectionObserver reveal
  components/SectionHeader.tsx
  components/Footer.tsx
```

## Behavior notes

- **Animations in React:** each Astro `<script>` block becomes a `useEffect`
  with cleanup (kill GSAP timelines/ScrollTriggers, clear timeouts, remove
  listeners). No `astro:page-load` events — effects run on mount.
- **Nav hash links:** `/#section` anchors; `App.tsx` scrolls to the hash on
  navigation (including when arriving from a project detail page).
- **LeetCode stats:** LeetCode's GraphQL API is not callable from the browser
  (CORS), so `scripts/fetch-leetcode.ts` runs before `vite build`, queries
  `leetcode.com/graphql` for user `teomeehua`, and writes
  `src/data/leetcode.json`. On failure it leaves the existing JSON untouched;
  if no data exists, the UI renders "—" (same fallback as the Astro site).
  Dev mode uses the committed snapshot.
- **Project detail pages:** rendered from `projects.ts` by slug; unknown slug
  shows a simple not-found message with a link home. FinGuardMY page includes
  the `Architecture.svg` image, as today.
- **SPA vs SSG trade-off (accepted):** the Astro site pre-rendered HTML; the
  React SPA renders client-side. Fine for a personal portfolio; deployment
  needs an SPA fallback rewrite (e.g. Cloudflare Pages `/* → /index.html`).

## Out of scope

- Visual redesign of any kind
- Deployment / wrangler config (can be added later)
- The unused `@radix-ui/react-dialog` dependency — not carried over

## Verification

- `bun run build` succeeds (includes `tsc -b` type-check)
- Dev server renders home and both project detail pages; animations fire;
  screenshots taken to confirm parity with the original
