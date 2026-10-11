import { expect, test } from 'bun:test';
import { chunkMarkdown } from './chunk';

test('one chunk per ## section, comments and empty sections dropped', () => {
  const md = '# Title\n<!-- note -->\n## A\nalpha\n## Empty\n<!-- nothing -->\n## B\nbeta';
  const chunks = chunkMarkdown('f', md);
  expect(chunks.map((c) => c.source)).toEqual(['Title - A', 'Title - B']);
  expect(chunks[0].text).toBe('Title - A\nalpha');
  expect(new Set(chunks.map((c) => c.id)).size).toBe(2);
});

test('long sections split at paragraph breaks', () => {
  const para = 'x'.repeat(700);
  const chunks = chunkMarkdown('f', `# T\n## A\n${para}\n\n${para}`);
  expect(chunks.length).toBe(2);
});
