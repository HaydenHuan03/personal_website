# haydenhuan.com

Personal site and portfolio of Hayden Huan — React Router v7 (framework mode,
SSR) running on Cloudflare Workers.

Live at **[haydenhuan.com](https://haydenhuan.com)**.

## Stack

| Concern | Choice |
|---|---|
| Runtime / package manager | [Bun](https://bun.sh) 1.3+ |
| Framework | React 19 + React Router v7, framework mode, `ssr: true` |
| Styling | Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js`) |
| 3D / motion | `@react-three/fiber`, `@react-three/drei`, `gsap`, `motion` |
| Host | Cloudflare Workers (not Pages), deployed with `wrangler` |

Path alias `@/*` → `src/*`, declared in both `tsconfig.json` and `vite.config.ts`.
Theme tokens live in `@theme` blocks in `src/styles/global.css`.

## Getting started

```bash
bun install     # postinstall runs `wrangler types` to generate worker-configuration.d.ts
bun run dev     # dev server on the real Workers runtime, via @cloudflare/vite-plugin
```

`bun install` is not optional before type-checking: `worker-configuration.d.ts`
is gitignored and generated, so a fresh clone won't type-check until the
postinstall hook has run.

## Commands

```bash
bun run dev          # dev server (SSR, real Workers runtime)
bun run build        # full pipeline — see below
bun run preview      # build, then preview the Worker locally
bun run deploy       # build, then wrangler deploy
bun run cf-typegen   # regenerate worker-configuration.d.ts from wrangler.jsonc
bunx tsc --noEmit    # type-check only
```

There is no lint script. **`bun run build` is the source of truth for
correctness** — it runs the data-fetch scripts, regenerates Worker and route
types, runs `tsc --noEmit`, and only then bundles. A type error fails the build
before any bundling happens.

## Deploying

```bash
bunx wrangler login   # once per machine; the token expires periodically
bun run deploy
```

**Always deploy with `bun run deploy`, never a bare `wrangler deploy`.** The
Worker entry `workers/app.ts` imports `virtual:react-router/server-build`, a
module that Vite's React Router plugin only resolves *during a build*. Running
`wrangler deploy` directly against source fails to resolve it.

A production build writes two trees, both gitignored:

- `build/client` — static assets, served by the Worker's assets binding
- `build/server` — the SSR bundle the Worker imports

Verify a deploy landed:

```bash
curl -sI https://haydenhuan.com          # expect HTTP/2 200, server: cloudflare
curl -s  https://haydenhuan.com | head   # expect real SSR'd HTML, not an empty shell
```

### Domain

The custom domain is declared in `wrangler.jsonc`, not clicked together in the
dashboard:

```jsonc
"routes": [
  { "pattern": "haydenhuan.com", "custom_domain": true }
]
```

`custom_domain: true` means Cloudflare creates the DNS record and issues the
certificate itself on deploy. The zone must already be delegated to Cloudflare
(it is — nameservers `lewis` / `meadow.ns.cloudflare.com`). To add `www` or
another hostname, add another entry and redeploy.

If Cloudflare refuses to attach the domain, check the zone's DNS tab for a
pre-existing A or CNAME on that hostname; it must be removed first.

## Project structure

```
src/
  root.tsx             HTML shell: meta tags, theme script (no dark-mode flash), ScrollToHash
  routes.ts            route table; each route is a file in pages/
  entry.client.tsx     hydration entry
  entry.server.tsx     SSR entry
  pages/               one component per route
  components/
    layout/            page chrome: Navbar (with CardNav, ThemeToggle), Footer, BackLink
    ui/                reusable pieces with no page logic: SectionHeader, ImageLightbox,
                       InlineMarkup, animation effects, the WanderingEyes loader
    home/              home-page sections, in page order: Hero, LeetCode, Projects, Journey
    leetcode/          /leetcode list and problem pages: filters, rows, problem detail, code view
    gallery/           /gallery page
      globe/           3D globe, and the flat WorldMap shown when WebGL is missing
      country/         3D country slab shown after picking a country
      landmark/        landmark model: hover preview on the map, and standing on the country
      (top level)      page parts: CountryHeading, PhotoStream, scroll hand-over, shared
                       timings; plus SceneEnvironment and quietThree, which load three.js
                       and are only imported by the *Scene files
  hooks/               generic React hooks: media queries, reduced motion, hover effects
  lib/                 plain TypeScript, no React: formatting, geometry, LeetCode filters
                       and URLs, the `cn` class joiner
  types/               shared data shapes: gallery manifest, world map, LeetCode snapshot
  data/                content: hand-written projects and gallery, generated JSON
  styles/              global.css (Tailwind and theme tokens), journey.css
scripts/               Bun scripts that generate src/data
workers/app.ts         Cloudflare Worker entry
```

Imports across folders use the `@/` alias; imports within a folder use `./`.

The 3D gallery pieces come in pairs. `XCanvas` is what a page renders: it
waits for the browser, then lazily loads `XScene`, which holds the three.js
code. Import the `Canvas`, never the `Scene`, so three.js stays out of server
rendering.

## Managing it

### Content

- **Projects** — `src/data/projects.ts`, hand-written. Rendered by
  `ProjectsSection` and, per slug, `ProjectDetailPage`.
- **Home-page sections** — components in `src/components/home/`. When adding or
  renaming a section, keep its `id` in sync with the `/#id` links in `Navbar`;
  the scroll-spy indicator and `ScrollToHash` in `src/root.tsx` both depend on
  that match.
- **LeetCode data** — generated, never edit by hand. See below.
- **Routes** — declared in `src/routes.ts`. React Router code-splits each route
  into its own client chunk automatically; no manual `React.lazy`/`Suspense`.

### LeetCode data (the main architectural quirk)

LeetCode's GraphQL API and GitHub's REST API aren't callable from the browser
without CORS and rate-limit problems, so two Bun scripts run **before** the
build and write committed JSON snapshots that the app imports statically:

```bash
bun scripts/fetch-leetcode.ts    # → src/data/leetcode.json (solved counts)
bun scripts/fetch-solutions.ts   # → src/data/leetcode-solutions.json
                                 #   + src/data/leetcode-descriptions.json
```

`fetch-solutions.ts` walks the public LeetHub repo `HaydenHuan03/Leetcode`
(branch `main`) via GitHub's API, reusing cached metadata and code keyed by blob
`sha` and only fetching fresh data for problems that changed.

Both scripts share one failure policy: **on any fetch failure, leave the
existing committed snapshot untouched and exit 0.** A flaky upstream API must
never break a build or blank out already-synced data. Preserve that behavior
when editing them.

Pure logic is factored into `scripts/lib/solutions.ts` and
`scripts/lib/description.ts` — put new parsing and merging logic there rather
than inline in the fetch scripts.

`.github/workflows/refresh-leetcode.yml` runs both scripts daily at 02:00 UTC
(and on `workflow_dispatch`), committing `src/data/` only when it actually
changed. That `git diff --quiet` guard keeps the history clean and avoids
no-op deploys. Note it commits but **does not deploy** — a data refresh reaches
the live site on the next deploy.

### Monitoring

`observability` is enabled in `wrangler.jsonc`, so request logs and errors are
in the Cloudflare dashboard under the `personal-website` Worker. `wrangler tail`
streams them live.

## Troubleshooting

**The domain won't load right after a deploy, but `curl` from elsewhere works.**
Almost always a stale negative DNS cache rather than a broken deploy. Confirm
where it breaks before changing anything:

```bash
dig @1.1.1.1 haydenhuan.com A +short    # public resolver — should return the Cloudflare IPs
dig haydenhuan.com A +short             # your resolver — if empty, it's a local/upstream cache
```

If the public resolver answers and yours doesn't, your resolver cached a
negative answer from before the record existed. The SOA negative TTL is 1800s,
so it can persist for 30 minutes. Flush locally, and if that fails, the stale
entry is upstream (a router, or a phone hotspot's DNS proxy) and you must
bypass it:

```bash
sudo resolvectl flush-caches
sudo resolvectl dns <interface> 1.1.1.1 8.8.8.8   # per-link, resets on reconnect
```

Chrome keeps its own cache at `chrome://net-internals/#dns`.

**`bunx tsc --noEmit` fails on a fresh clone.** Run `bun install` so the
postinstall `wrangler types` hook generates `worker-configuration.d.ts`.

**`wrangler deploy` fails to resolve `virtual:react-router/server-build`.** Use
`bun run deploy`; see Deploying above.

**Vite output paths look wrong after upgrading dependencies.** `vite.config.ts`
pins explicit `outDir`s for the client and `ssr` environments as a
version-sensitive workaround between `@react-router/dev` and
`@cloudflare/vite-plugin`. Re-check it whenever either package is upgraded; the
reasoning is in a comment there.
