import { describe, expect, test } from 'bun:test';
import { formatProjectDate } from './projectDate';

describe('formatProjectDate', () => {
  test('formats YYYY-MM as "Mon YYYY"', () => {
    expect(formatProjectDate('2026-02')).toBe('Feb 2026');
    expect(formatProjectDate('2025-11')).toBe('Nov 2025');
  });

  test('covers January and December boundaries', () => {
    expect(formatProjectDate('2024-01')).toBe('Jan 2024');
    expect(formatProjectDate('2024-12')).toBe('Dec 2024');
  });

  test('throws on malformed input', () => {
    expect(() => formatProjectDate('2026')).toThrow(/YYYY-MM/);
    expect(() => formatProjectDate('2026-13')).toThrow(/YYYY-MM/);
    expect(() => formatProjectDate('2026-2')).toThrow(/YYYY-MM/);
    expect(() => formatProjectDate('Feb 2026')).toThrow(/YYYY-MM/);
  });
});
