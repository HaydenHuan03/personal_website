import { describe, expect, test } from 'bun:test';
import { parseInline } from './inlineMarkup';

describe('parseInline', () => {
  test('plain text is a single non-bold segment', () => {
    expect(parseInline('hello world')).toEqual([{ text: 'hello world', bold: false }]);
  });

  test('bold span in the middle', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  test('bold at start and multiple spans', () => {
    expect(parseInline('**x** and **y**')).toEqual([
      { text: 'x', bold: true },
      { text: ' and ', bold: false },
      { text: 'y', bold: true },
    ]);
  });

  test('unmatched marker is kept as literal text', () => {
    expect(parseInline('a **b')).toEqual([{ text: 'a **b', bold: false }]);
  });

  test('empty string yields no segments', () => {
    expect(parseInline('')).toEqual([]);
  });
});
