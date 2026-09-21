import { afterEach, describe, expect, test } from 'bun:test';
import { isCoarsePointer, prefersReducedMotion } from './motion';

type FakeWindow = { matchMedia?: (q: string) => { matches: boolean } };
const g = globalThis as unknown as { window?: FakeWindow };

function stubMatchMedia(matching: string[]) {
  g.window = { matchMedia: (q: string) => ({ matches: matching.includes(q) }) };
}

afterEach(() => {
  delete g.window;
});

describe('prefersReducedMotion', () => {
  test('false when window is undefined', () => {
    delete g.window;
    expect(prefersReducedMotion()).toBe(false);
  });

  test('false when matchMedia is missing', () => {
    g.window = {};
    expect(prefersReducedMotion()).toBe(false);
  });

  test('true when the reduce query matches', () => {
    stubMatchMedia(['(prefers-reduced-motion: reduce)']);
    expect(prefersReducedMotion()).toBe(true);
  });

  test('false when the reduce query does not match', () => {
    stubMatchMedia([]);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('isCoarsePointer', () => {
  test('true when the coarse query matches', () => {
    stubMatchMedia(['(pointer: coarse)']);
    expect(isCoarsePointer()).toBe(true);
  });

  test('false when window is undefined', () => {
    delete g.window;
    expect(isCoarsePointer()).toBe(false);
  });
});
