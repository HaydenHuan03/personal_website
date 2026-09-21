import path from 'node:path';
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), reactRouter()],
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
