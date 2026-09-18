import { describe, expect, test } from 'bun:test';
import type { Difficulty, Problem } from '../types/leetcode';
import {
  EMPTY_FILTERS,
  groupByPrimaryTopic,
  hasActiveFilters,
  matchesFilters,
  topicCounts,
} from './leetcodeSolutions';

function problem(over: Partial<Problem>): Problem {
  return {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    solutions: [],
    ...over,
  };
}

describe('matchesFilters', () => {
  const p = problem({});

  test('no filters matches everything', () => {
    expect(matchesFilters(p, EMPTY_FILTERS)).toBe(true);
  });

  test('query matches title case-insensitively and by id, with optional #', () => {
    expect(matchesFilters(p, { ...EMPTY_FILTERS, query: 'two' })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, query: 'TWO SUM' })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, query: '1' })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, query: '#1' })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, query: 'three' })).toBe(false);
  });

  test('difficulty filter', () => {
    expect(matchesFilters(p, { ...EMPTY_FILTERS, difficulties: new Set<Difficulty>(['Easy']) })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, difficulties: new Set<Difficulty>(['Hard']) })).toBe(false);
    expect(
      matchesFilters(problem({ difficulty: null }), { ...EMPTY_FILTERS, difficulties: new Set<Difficulty>(['Easy']) })
    ).toBe(false);
  });

  test('topic filter matches any tag, not only the primary one', () => {
    expect(matchesFilters(p, { ...EMPTY_FILTERS, topics: new Set(['Hash Table']) })).toBe(true);
    expect(matchesFilters(p, { ...EMPTY_FILTERS, topics: new Set(['Graph']) })).toBe(false);
  });

  test('filters combine with AND', () => {
    expect(
      matchesFilters(p, { query: 'two', difficulties: new Set<Difficulty>(['Hard']), topics: new Set(['Array']) })
    ).toBe(false);
  });
});

describe('hasActiveFilters', () => {
  test('detects each kind', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: ' ' })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: 'a' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, difficulties: new Set<Difficulty>(['Easy']) })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, topics: new Set(['Array']) })).toBe(true);
  });
});

describe('topicCounts', () => {
  test('counts every tag, sorted by count desc then name asc', () => {
    const counts = topicCounts([
      problem({ id: 1, topics: ['Array', 'Hash Table'] }),
      problem({ id: 2, topics: ['Array', 'Two Pointers'] }),
      problem({ id: 3, topics: ['Hash Table'] }),
      problem({ id: 4, topics: [] }),
    ]);
    expect(counts).toEqual([
      { name: 'Array', count: 2 },
      { name: 'Hash Table', count: 2 },
      { name: 'Two Pointers', count: 1 },
    ]);
  });
});

describe('groupByPrimaryTopic', () => {
  test('each problem appears once under topics[0]; groups by size desc then name; problems by id', () => {
    const groups = groupByPrimaryTopic([
      problem({ id: 5, topics: ['Hash Table', 'Array'] }),
      problem({ id: 2, topics: ['Array', 'Hash Table'] }),
      problem({ id: 9, topics: [] }),
      problem({ id: 1, topics: ['Array'] }),
      problem({ id: 3, topics: ['Graph'] }),
    ]);
    expect(groups.map((g) => [g.topic, g.problems.map((p) => p.id)])).toEqual([
      ['Array', [1, 2]],
      ['Graph', [3]],
      ['Hash Table', [5]],
      ['Uncategorised', [9]],
    ]);
  });
});
