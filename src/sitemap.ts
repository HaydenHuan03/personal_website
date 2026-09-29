import { projects } from '@/data/projects';
import { SITE_URL } from '@/lib/meta';
import type { SolutionsSnapshot } from '@/types/leetcode';
import snapshotJson from '@/data/leetcode-solutions.json';

const PROBLEMS = (snapshotJson as unknown as SolutionsSnapshot).problems;

// Built from the same data as the pages, so new projects and problems show up on their own.
export function loader() {
  const paths = [
    '/',
    '/leetcode',
    '/gallery',
    ...projects.map((p) => `/projects/${p.slug}`),
    ...PROBLEMS.map((p) => `/leetcode/${p.slug}`),
  ];
  const urls = paths.map((path) => `<url><loc>${SITE_URL}${path}</loc></url>`).join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
}
