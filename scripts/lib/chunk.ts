import type { ChunkMetadata } from '../../src/lib/rag';

export interface Chunk extends ChunkMetadata {
  id: string;
}

const MAX_CHARS = 1200;

/** Splits text that is over the limit at paragraph breaks. */
function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const parts: string[] = [];
  let current = '';
  for (const para of text.split(/\n{2,}/)) {
    if (current && current.length + para.length > MAX_CHARS) {
      parts.push(current);
      current = '';
    }
    current += (current ? '\n\n' : '') + para;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * One chunk per `##` section. The `#` title and section heading go into the
 * text so each chunk makes sense on its own. HTML comments are notes to self.
 */
export function chunkMarkdown(file: string, markdown: string): Chunk[] {
  const clean = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const title = clean.match(/^#\s+(.+)$/m)?.[1].trim() ?? file;
  const chunks: Chunk[] = [];
  for (const section of clean.split(/^##\s+/m).slice(1)) {
    const [heading, ...rest] = section.split('\n');
    const body = rest.join('\n').trim();
    if (!body) continue;
    const source = `${title} - ${heading.trim()}`;
    splitLong(body).forEach((part, i) => {
      chunks.push({ id: `${file}#${chunks.length}.${i}`, source, text: `${source}\n${part}` });
    });
  }
  return chunks;
}
