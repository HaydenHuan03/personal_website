import type { DescriptionMap, Difficulty, Problem, Solution, SolutionsSnapshot } from '../src/types/leetcode';
import { sanitizeDescription } from './lib/description';
import { groupBlobs, sortSolutions, type ProblemFiles } from './lib/solutions';
import { DIFFICULTIES } from '../src/lib/leetcode';

const REPO = 'HaydenHuan03/Leetcode';
const BRANCH = 'main';
const OUT = new URL('../src/data/leetcode-solutions.json', import.meta.url).pathname;
const DESC_OUT = new URL('../src/data/leetcode-descriptions.json', import.meta.url).pathname;
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
  description: string | null;
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    return (await file.json()) as T;
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
              content
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
          content?: string | null;
        } | null;
      };
    };
    const q = json.data?.question;
    if (!q) return null;
    const difficulty = DIFFICULTIES.find((d) => d === q.difficulty) ?? null;
    // Some problems have no tags; use the category instead.
    const topics = q.topicTags.map((t) => t.name);
    if (topics.length === 0 && q.categoryTitle) topics.push(q.categoryTitle);
    const description = q.content ? sanitizeDescription(q.content) : null;
    return { title: q.title, difficulty, topics, description: description || null };
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

interface Built {
  problem: Problem;
  description: string | null;
}

async function buildProblem(
  pf: ProblemFiles,
  cached: Problem | undefined,
  cachedDescription: string | undefined
): Promise<Built | null> {
  // Reuse cached metadata unless it is incomplete (no difficulty, topics or description).
  let meta: Meta;
  if (cached && cached.difficulty !== null && cached.topics.length > 0 && cachedDescription !== undefined) {
    meta = { title: cached.title, difficulty: cached.difficulty, topics: cached.topics, description: cachedDescription };
  } else {
    const fetched = await fetchMeta(pf.slug);
    if (!fetched) console.warn(`No LeetCode metadata for ${pf.slug}; using slug fallback`);
    meta = fetched ?? {
      title: cached?.title ?? titleFromSlug(pf.slug),
      difficulty: cached?.difficulty ?? null,
      topics: cached?.topics ?? [],
      description: cachedDescription ?? null,
    };
  }
  const { description, ...problemMeta } = meta;

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

  return {
    problem: { id: pf.id, slug: pf.slug, ...problemMeta, solutions: sortSolutions(solutions) },
    description,
  };
}

const cache = await loadJson<SolutionsSnapshot>(OUT);
const cachedBySlug = new Map((cache?.problems ?? []).map((p) => [p.slug, p]));
const cachedDescriptions = (await loadJson<DescriptionMap>(DESC_OUT)) ?? {};

const tree = await fetchTree();
const groups = tree ? groupBlobs(tree.filter((e) => e.type === 'blob')) : [];

if (groups.length === 0) {
  console.warn('LeetCode solutions fetch failed — keeping existing snapshot');
} else {
  const built = await mapLimit(groups, CONCURRENCY, (pf) =>
    buildProblem(pf, cachedBySlug.get(pf.slug), cachedDescriptions[pf.slug])
  );
  const results = built.filter((b): b is Built => b !== null);
  const problems = results.map((b) => b.problem);
  const descriptions: DescriptionMap = {};
  for (const { problem, description } of results) {
    if (description) descriptions[problem.slug] = description;
  }

  if (cache && JSON.stringify(cache.problems) === JSON.stringify(problems)) {
    // Nothing changed: keep the old fetchedAt so the daily job has nothing to commit.
    console.log(`LeetCode solutions unchanged: ${problems.length} problems`);
  } else {
    const snapshot: SolutionsSnapshot = { fetchedAt: new Date().toISOString(), problems };
    await Bun.write(OUT, JSON.stringify(snapshot, null, 2) + '\n');
    const reused = problems.filter((p) => cachedBySlug.has(p.slug)).length;
    console.log(`LeetCode solutions updated: ${problems.length} problems (${reused} reused from cache)`);
  }

  if (JSON.stringify(cachedDescriptions) !== JSON.stringify(descriptions)) {
    await Bun.write(DESC_OUT, JSON.stringify(descriptions, null, 2) + '\n');
    console.log(`LeetCode descriptions updated: ${Object.keys(descriptions).length} problems`);
  }
}
