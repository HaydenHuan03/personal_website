import { describe, expect, test } from 'bun:test';
import { sanitizeDescription } from './description';

describe('sanitizeDescription', () => {
  test('keeps ordinary problem markup', () => {
    const html = '<p>Given <code>nums</code>, return <em>indices</em>.</p>\n<pre>\n<strong>Input:</strong> [1]\n</pre>\n<ul>\n\t<li><code>10<sup>4</sup></code></li>\n</ul>';
    expect(sanitizeDescription(html)).toBe(html);
  });

  test('drops script and style blocks with their contents', () => {
    expect(sanitizeDescription('<p>a</p><script>alert(1)</script><style>p{}</style><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });

  test('strips inline event handlers and javascript: urls', () => {
    expect(sanitizeDescription('<p onclick="x()" class="k">a</p><a href="javascript:evil()">b</a>')).toBe(
      '<p class="k">a</p><a>b</a>'
    );
  });

  test('unwraps font tags', () => {
    expect(sanitizeDescription('<strong>Follow-up:</strong><font face="monospace">O(n)</font>?')).toBe(
      '<strong>Follow-up:</strong>O(n)?'
    );
  });

  test('removes empty spacer paragraphs and trims', () => {
    expect(sanitizeDescription('\n<p>a</p>\n\n<p>&nbsp;</p>\n<p> </p>\n<p>b</p>\n')).toBe('<p>a</p>\n\n<p>b</p>');
  });
});
