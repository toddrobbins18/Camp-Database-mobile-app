const HTML_TAG = /<[a-z][\s\S]*>/i;

export function looksLikeHtml(content: string): boolean {
  return HTML_TAG.test(content);
}

export function shouldRenderMessageAsHtml(
  content: string,
  opts?: { senderId?: string | null; notificationType?: string | null }
): boolean {
  if (!looksLikeHtml(content)) return false;
  if (!opts?.senderId) return true;
  const t = (opts.notificationType || '').toLowerCase();
  return t === 'automated' || t === 'system' || t === 'notification';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Strip tags and normalize whitespace for list previews. */
export function htmlToPlainText(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return decodeHtmlEntities(text);
}

export function messageContentPreview(content: string, maxLen = 100): string {
  const text = looksLikeHtml(content) ? htmlToPlainText(content) : content.trim();
  if (text.length <= maxLen) return text;
  return `${text.substring(0, maxLen)}...`;
}

export type MessageContentBlock =
  | { kind: 'heading'; text: string; level: 2 | 3 }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string };

/** Parse automated email HTML into blocks for native Text rendering. */
export function parseMessageHtmlBlocks(html: string): MessageContentBlock[] {
  const blocks: MessageContentBlock[] = [];
  const stripInline = (s: string) =>
    decodeHtmlEntities(s.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1').replace(/<[^>]+>/g, '').trim());

  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;

  let match: RegExpExecArray | null;
  const ordered: { index: number; block: MessageContentBlock }[] = [];

  h2Re.lastIndex = 0;
  while ((match = h2Re.exec(html)) !== null) {
    const text = stripInline(match[1]);
    if (text) ordered.push({ index: match.index, block: { kind: 'heading', level: 2, text } });
  }
  h3Re.lastIndex = 0;
  while ((match = h3Re.exec(html)) !== null) {
    const text = stripInline(match[1]);
    if (text) ordered.push({ index: match.index, block: { kind: 'heading', level: 3, text } });
  }
  pRe.lastIndex = 0;
  while ((match = pRe.exec(html)) !== null) {
    const text = stripInline(match[1]);
    if (text) ordered.push({ index: match.index, block: { kind: 'paragraph', text } });
  }
  liRe.lastIndex = 0;
  while ((match = liRe.exec(html)) !== null) {
    const text = stripInline(match[1]);
    if (text) ordered.push({ index: match.index, block: { kind: 'bullet', text } });
  }

  ordered.sort((a, b) => a.index - b.index);
  for (const { block } of ordered) blocks.push(block);

  if (blocks.length === 0) {
    const fallback = htmlToPlainText(html);
    if (fallback) blocks.push({ kind: 'paragraph', text: fallback });
  }

  return blocks;
}
