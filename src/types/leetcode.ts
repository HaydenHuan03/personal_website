export type Language = 'cpp' | 'python' | 'java' | 'javascript' | 'csharp';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Solution {
  language: Language;
  /** Path inside the LeetHub repo, e.g. "0001-two-sum/0001-two-sum.py" */
  path: string;
  /** Git blob SHA, used to skip re-downloading unchanged files */
  sha: string;
  code: string;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty | null;
  /** LeetCode's tag order; index 0 is the primary topic */
  topics: string[];
  solutions: Solution[];
}

export interface SolutionsSnapshot {
  fetchedAt: string;
  problems: Problem[];
}
