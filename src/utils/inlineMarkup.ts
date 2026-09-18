export interface InlineSegment {
  text: string;
  bold: boolean;
}

/**
 * Splits a string on `**` markers into plain and bold segments.
 * An unmatched trailing `**` is treated as literal text.
 */
export function parseInline(text: string): InlineSegment[] {
  const parts = text.split('**');
  if (parts.length % 2 === 0) {
    // Odd number of markers: re-join the last piece as literal text.
    const tail = parts.pop() ?? '';
    parts[parts.length - 1] += `**${tail}`;
  }
  return parts
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((seg) => seg.text.length > 0);
}
