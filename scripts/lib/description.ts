/** Cleans LeetCode's problem-statement HTML so it can be rendered raw on the site. */
export function sanitizeDescription(html: string): string {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
    .replace(/<\/?font\b[^>]*>/gi, '')
    .replace(/<p>(?:&nbsp;|\s)*<\/p>\n?/gi, '')
    .trim();
}
