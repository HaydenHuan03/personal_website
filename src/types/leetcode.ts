export type Language = 'cpp' | 'python' | 'java' | 'javascript' | 'csharp';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Solution {
  language: Language;
  path: string;
  sha: string;
  code: string;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty | null;
  topics: string[];
  solutions: Solution[];
}

/** What the problem list needs, without the solution code. */
export type ProblemSummary = Omit<Problem, 'solutions'>;

export interface SolutionsSnapshot {
  fetchedAt: string;
  problems: Problem[];
}

export type DescriptionMap = Record<string, string>;

export interface LeetCodeStats {
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
}
