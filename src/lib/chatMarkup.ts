import { parseInline } from '@/lib/inlineMarkup';

/** The small slice of markdown the chat model actually writes: paragraphs, bullet lists, bold, links. */
export type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

export interface RichSegment {
  text: string;
  bold: boolean;
  href?: string;
}

const LIST_ITEM = /^(?:[-*•]|\d+[.)])\s+(.*)$/;
// Trailing sentence punctuation stays outside the link.
const LINK = /(https?:\/\/[^\s)]*[^\s).,!?;:]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const item = line.match(LIST_ITEM);
    const last = blocks.at(-1);
    if (!item) blocks.push({ type: 'p', text: line });
    else if (last?.type === 'ul') last.items.push(item[1]);
    else blocks.push({ type: 'ul', items: [item[1]] });
  }
  return blocks;
}

export function parseRich(text: string): RichSegment[] {
  return parseInline(text).flatMap(({ text: part, bold }) =>
    part
      .split(new RegExp(LINK.source, 'g'))
      .filter(Boolean)
      .map((piece) => {
        if (!new RegExp(`^${LINK.source}$`).test(piece)) return { text: piece, bold };
        const href = piece.includes('@') && !piece.startsWith('http') ? `mailto:${piece}` : piece;
        return { text: piece, bold, href };
      })
  );
}
