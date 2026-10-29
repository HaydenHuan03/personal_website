import { expect, test } from 'bun:test';
import { loader as listLoader } from './LeetCodePage';
import { loader as problemLoader } from './LeetCodeProblemPage';
import type { Route } from './+types/LeetCodeProblemPage';

const problemArgs = (slug: string) => ({ params: { slug } }) as unknown as Route.LoaderArgs;

test('the list sends no solution code', () => {
  const { problems, topics } = listLoader();
  expect(problems.length).toBeGreaterThan(0);
  expect(topics.length).toBeGreaterThan(0);
  for (const p of problems) expect('solutions' in p).toBe(false);
});

test('a problem page sends only that problem', () => {
  const slug = listLoader().problems[0].slug;
  const result = problemLoader(problemArgs(slug));
  expect(result && 'problem' in result && result.problem.slug).toBe(slug);
});

test('an unknown problem is a 404', () => {
  const result = problemLoader(problemArgs('no-such-problem'));
  expect(result && 'init' in result && result.init?.status).toBe(404);
});
