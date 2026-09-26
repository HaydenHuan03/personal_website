import type { Language } from '../../src/types/leetcode';

const LANGUAGE_BY_EXT: Record<string, Language> = {
  cpp: 'cpp',
  py: 'python',
  java: 'java',
  js: 'javascript',
  cs: 'csharp',
};

const LANGUAGE_ORDER: Language[] = ['cpp', 'python', 'java', 'javascript', 'csharp'];

/** "0001-two-sum/0001-two-sum.py" — folder and file stem must match. */
const SOLUTION_PATH = /^(\d+)-([a-z0-9-]+)\/\1-\2\.([a-z]+)$/;

export interface ParsedPath {
  id: number;
  slug: string;
  folder: string;
  language: Language;
}

function parseSolutionPath(path: string): ParsedPath | null {
  const m = SOLUTION_PATH.exec(path);
  if (!m) return null;
  const language = LANGUAGE_BY_EXT[m[3]];
  if (!language) return null;
  return { id: Number(m[1]), slug: m[2], folder: `${m[1]}-${m[2]}`, language };
}

export interface SolutionFile {
  path: string;
  sha: string;
  language: Language;
}

export interface ProblemFiles {
  id: number;
  slug: string;
  files: SolutionFile[];
}

export function groupBlobs(blobs: { path: string; sha: string }[]): ProblemFiles[] {
  const byFolder = new Map<string, ProblemFiles>();
  for (const blob of blobs) {
    const parsed = parseSolutionPath(blob.path);
    if (!parsed) continue;
    let entry = byFolder.get(parsed.folder);
    if (!entry) {
      entry = { id: parsed.id, slug: parsed.slug, files: [] };
      byFolder.set(parsed.folder, entry);
    }
    entry.files.push({ path: blob.path, sha: blob.sha, language: parsed.language });
  }
  return [...byFolder.values()].sort((a, b) => a.id - b.id);
}

export function sortSolutions<T extends { language: Language }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => LANGUAGE_ORDER.indexOf(a.language) - LANGUAGE_ORDER.indexOf(b.language)
  );
}
