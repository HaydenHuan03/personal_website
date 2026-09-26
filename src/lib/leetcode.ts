import type { Difficulty, Language, Problem } from '@/types/leetcode';

export const LANGUAGE_LABELS: Record<Language, string> = {
  cpp: 'C++',
  python: 'Python',
  java: 'Java',
  javascript: 'JavaScript',
  csharp: 'C#',
};

export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];

const UNCATEGORISED = 'Uncategorised';

export const REPO_URL = 'https://github.com/HaydenHuan03/Leetcode';
export const PROFILE_URL = 'https://leetcode.com/u/teomeehua/';

export interface Filters {
  query: string;
  difficulties: ReadonlySet<Difficulty>;
  topics: ReadonlySet<string>;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  difficulties: new Set(),
  topics: new Set(),
};

export function hasActiveFilters(f: Filters): boolean {
  return f.query.trim() !== '' || f.difficulties.size > 0 || f.topics.size > 0;
}

export function matchesFilters(p: Problem, f: Filters): boolean {
  const q = f.query.trim().replace(/^#/, '').toLowerCase();
  if (q && !String(p.id).includes(q) && !p.title.toLowerCase().includes(q)) return false;
  if (f.difficulties.size > 0 && (p.difficulty === null || !f.difficulties.has(p.difficulty))) return false;
  if (f.topics.size > 0 && !p.topics.some((t) => f.topics.has(t))) return false;
  return true;
}

export interface TopicCount {
  name: string;
  count: number;
}

function byCountDescThenName(a: TopicCount, b: TopicCount): number {
  return b.count - a.count || a.name.localeCompare(b.name);
}

export function topicCounts(problems: Problem[]): TopicCount[] {
  const counts = new Map<string, number>();
  for (const p of problems) {
    for (const t of p.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort(byCountDescThenName);
}

export interface TopicGroup {
  topic: string;
  problems: Problem[];
}

export function groupByPrimaryTopic(problems: Problem[]): TopicGroup[] {
  const groups = new Map<string, Problem[]>();
  for (const p of problems) {
    const key = p.topics[0] ?? UNCATEGORISED;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  return [...groups]
    .map(([topic, list]) => ({ topic, problems: [...list].sort((a, b) => a.id - b.id) }))
    .sort((a, b) =>
      byCountDescThenName(
        { name: a.topic, count: a.problems.length },
        { name: b.topic, count: b.problems.length }
      )
    );
}

export function leetcodeProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function githubFileUrl(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}
