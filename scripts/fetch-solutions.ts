/**
 * Prebuild step: pull every solution from the LeetHub repo and snapshot it
 * into src/data/leetcode-solutions.json. Incremental: unchanged files (same
 * blob SHA) and known problems are reused from the previous snapshot. On any
 * fatal failure the existing snapshot is left untouched so the build never
 * breaks on a flaky external API.
 */
import type { Difficulty, Problem, Solution, SolutionsSnapshot } from '../src/types/leetcode';
import { groupBlobs, sortSolutions, type ProblemFiles } from './lib/solutions';

const REPO = 'HaydenHuan03/Leetcode';
const BRANCH = 'main';
const OUT = new URL('../src/data/leetcode-solutions.json', import.meta.url).pathname;
const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;

interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree' | 'commit';
}

interface Meta {
  title: string;
  difficulty: Difficulty | null;
  topics: string[];
}

async function loadCache(): Promise<SolutionsSnapshot | null> {
  try {
    const file = Bun.file(OUT);
    if (!(await file.exists())) return null;
    return (await file.json()) as SolutionsSnapshot;
  } catch {
    return null;
  }
}

async function fetchTree(): Promise<TreeEntry[] | null> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`GitHub tree request failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { tree?: TreeEntry[]; truncated?: boolean };
    if (json.truncated) console.warn('GitHub tree was truncated; some solutions may be missing');
    return json.tree ?? null;
  } catch (err) {
    console.warn(`GitHub tree request errored: ${String(err)}`);
    return null;
  }
}

async function fetchRaw(path: string): Promise<string | null> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.replace(/\r\n/g, '\n').trimEnd();
  } catch {
    return null;
  }
}

async function fetchMeta(slug: string): Promise<Meta | null> {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query question($slug: String!) {
            question(titleSlug: $slug) {
              title
              difficulty
              topicTags { name }
              categoryTitle
            }
          }
        `,
        variables: { slug },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        question?: {
          title: string;
          difficulty: string;
          topicTags: { name: string }[];
          categoryTitle?: string | null;
        } | null;
      };
    };
    const q = json.data?.question;
    if (!q) return null;
    const difficulty = (['Easy', 'Medium', 'Hard'] as const).find((d) => d === q.difficulty) ?? null;
    // Some problems (e.g. "30 Days of JavaScript") have no tags; fall back to the category.
    const topics = q.topicTags.map((t) => t.name);
    if (topics.length === 0 && q.categoryTitle) topics.push(q.categoryTitle);
    return { title: q.title, difficulty, topics };
  } catch {
    return null;
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function buildProblem(pf: ProblemFiles, cached: Problem | undefined): Promise<Problem | null> {
  // Reuse cached metadata unless it came from the slug fallback (difficulty null / no topics).
  let meta: Meta;
  if (cached && cached.difficulty !== null && cached.topics.length > 0) {
    meta = { title: cached.title, difficulty: cached.difficulty, topics: cached.topics };
  } else {
    const fetched = await fetchMeta(pf.slug);
    if (!fetched) console.warn(`No LeetCode metadata for ${pf.slug}; using slug fallback`);
    meta = fetched ?? { title: titleFromSlug(pf.slug), difficulty: null, topics: [] };
  }

  const solutions: Solution[] = [];
  for (const file of pf.files) {
    const prev = cached?.solutions.find((s) => s.path === file.path);
    if (prev && prev.sha === file.sha) {
      solutions.push(prev);
      continue;
    }
    const code = await fetchRaw(file.path);
    if (code !== null) {
      solutions.push({ language: file.language, path: file.path, sha: file.sha, code });
    } else if (prev) {
      console.warn(`Download failed for ${file.path}; keeping previous copy`);
      solutions.push(prev);
    } else {
      console.warn(`Download failed for ${file.path}; skipping`);
    }
  }
  if (solutions.length === 0) return null;

  return { id: pf.id, slug: pf.slug, ...meta, solutions: sortSolutions(solutions) };
}

const cache = await loadCache();
const cachedBySlug = new Map((cache?.problems ?? []).map((p) => [p.slug, p]));

const tree = await fetchTree();
const groups = tree ? groupBlobs(tree.filter((e) => e.type === 'blob')) : [];

if (groups.length === 0) {
  console.warn('LeetCode solutions fetch failed — keeping existing snapshot');
} else {
  const built = await mapLimit(groups, CONCURRENCY, (pf) => buildProblem(pf, cachedBySlug.get(pf.slug)));
  const problems = built.filter((p): p is Problem => p !== null);
  if (cache && JSON.stringify(cache.problems) === JSON.stringify(problems)) {
    // Nothing changed; leave fetchedAt alone so the daily job has nothing to commit.
    console.log(`LeetCode solutions unchanged: ${problems.length} problems`);
  } else {
    const snapshot: SolutionsSnapshot = { fetchedAt: new Date().toISOString(), problems };
    await Bun.write(OUT, JSON.stringify(snapshot, null, 2) + '\n');
    const reused = problems.filter((p) => cachedBySlug.has(p.slug)).length;
    console.log(`LeetCode solutions updated: ${problems.length} problems (${reused} reused from cache)`);
  }
}
