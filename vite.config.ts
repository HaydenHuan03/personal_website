import path from 'node:path';
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), reactRouter()],
  // On this pinned @react-router/dev@7.18.4, the non-Environment-API SSR build path
  // expects the client/server bundles at build/client and build/server. But
  // @cloudflare/vite-plugin@1.56 (which does use Vite's Environment API) computes each
  // environment's default outDir independently as dist/<environmentName> unless told
  // otherwise. Left unset, the two plugins disagree and the build fails (client manifest
  // written to dist/client, looked up at build/client). Pinning both explicitly keeps
  // them in sync — re-check this block first if either package is upgraded.
  build: {
    outDir: 'build',
  },
  environments: {
    ssr: {
      build: {
        outDir: 'build/server',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
