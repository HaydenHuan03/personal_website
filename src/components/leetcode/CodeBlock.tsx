import type { CSSProperties } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import type { Language } from '../../types/leetcode';

SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);

// Minimal dark theme on the site's stone palette (Tailwind stone-900 background).
const base: CSSProperties = { color: '#e7e5e4', background: 'transparent' };
const theme: Record<string, CSSProperties> = {
  'code[class*="language-"]': base,
  'pre[class*="language-"]': { ...base, margin: 0 },
  comment: { color: '#78716c', fontStyle: 'italic' },
  prolog: { color: '#78716c' },
  doctype: { color: '#78716c' },
  cdata: { color: '#78716c' },
  punctuation: { color: '#a8a29e' },
  operator: { color: '#d6d3d1' },
  keyword: { color: '#c4b5fd' },
  'class-name': { color: '#fcd34d' },
  builtin: { color: '#fcd34d' },
  function: { color: '#93c5fd' },
  string: { color: '#86efac' },
  char: { color: '#86efac' },
  number: { color: '#fdba74' },
  boolean: { color: '#fdba74' },
  constant: { color: '#fdba74' },
  property: { color: '#e7e5e4' },
  variable: { color: '#e7e5e4' },
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

interface Props {
  code: string;
  language: Language;
}

export default function CodeBlock({ code, language }: Props) {
  return (
    <SyntaxHighlighter
      language={language}
      style={theme}
      customStyle={{ margin: 0, padding: '1.25rem', background: 'transparent', fontSize: '0.8125rem', lineHeight: 1.6 }}
      codeTagProps={{ style: { fontFamily: MONO } }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
