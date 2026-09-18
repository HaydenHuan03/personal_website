import { describe, expect, test } from 'bun:test';
import type { Language } from '../../src/types/leetcode';
import { groupBlobs, parseSolutionPath, sortSolutions } from './solutions';

describe('parseSolutionPath', () => {
  test('parses a valid solution file', () => {
    expect(parseSolutionPath('0001-two-sum/0001-two-sum.py')).toEqual({
      id: 1,
      slug: 'two-sum',
      folder: '0001-two-sum',
      language: 'python',
    });
  });

  test('maps every supported extension', () => {
    const exts: [string, Language][] = [
      ['cpp', 'cpp'],
      ['py', 'python'],
      ['java', 'java'],
      ['js', 'javascript'],
      ['cs', 'csharp'],
    ];
    for (const [ext, lang] of exts) {
      expect(parseSolutionPath(`0015-3sum/0015-3sum.${ext}`)?.language).toBe(lang);
    }
  });

  test('rejects READMEs, root files, and mismatched names', () => {
    expect(parseSolutionPath('0001-two-sum/README.md')).toBeNull();
    expect(parseSolutionPath('README.md')).toBeNull();
    expect(parseSolutionPath('stats.json')).toBeNull();
    expect(parseSolutionPath('0001-two-sum/0002-two-sum.py')).toBeNull();
    expect(parseSolutionPath('0001-two-sum/0001-two-sum.rb')).toBeNull();
  });
});

describe('groupBlobs', () => {
  test('groups files by problem folder, sorted by id', () => {
    const groups = groupBlobs([
      { path: '0015-3sum/0015-3sum.cpp', sha: 'c' },
      { path: '0001-two-sum/README.md', sha: 'r' },
      { path: '0001-two-sum/0001-two-sum.py', sha: 'p' },
      { path: '0001-two-sum/0001-two-sum.cpp', sha: 'q' },
      { path: 'stats.json', sha: 's' },
    ]);
    expect(groups).toEqual([
      {
        id: 1,
        slug: 'two-sum',
        files: [
          { path: '0001-two-sum/0001-two-sum.py', sha: 'p', language: 'python' },
          { path: '0001-two-sum/0001-two-sum.cpp', sha: 'q', language: 'cpp' },
        ],
      },
      { id: 15, slug: '3sum', files: [{ path: '0015-3sum/0015-3sum.cpp', sha: 'c', language: 'cpp' }] },
    ]);
  });

  test('ignores folders with only a README', () => {
    expect(groupBlobs([{ path: '0002-add-two-numbers/README.md', sha: 'r' }])).toEqual([]);
  });
});

describe('sortSolutions', () => {
  test('orders by fixed language order without mutating input', () => {
    const input = [{ language: 'javascript' as const }, { language: 'cpp' as const }, { language: 'python' as const }];
    const sorted = sortSolutions(input);
    expect(sorted.map((s) => s.language)).toEqual(['cpp', 'python', 'javascript']);
    expect(input.map((s) => s.language)).toEqual(['javascript', 'cpp', 'python']);
  });
});
