/**
 * Handling for the HTML the model is asked to produce.
 *
 * The summary text is model output derived from untrusted Discord messages, so it is
 * never rendered as raw HTML. Anything outside the allowlist is escaped by
 * `sanitizeSummaryHtml`, and `parseSummaryBlocks` reduces the result to plain text
 * blocks the UI renders with its own markup (no `{@html}` anywhere).
 */
const ALLOWED_TAGS = new Set(['h4', 'h5', 'ul', 'ol', 'li', 'p', 'strong', 'em', 'br']);

const escapeText = (value: string): string =>
  value.replace(/[&<>]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    return '&gt;';
  });

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function sanitizeSummaryHtml(input: string | undefined | null): string {
  if (!input) return '';

  const withoutComments = input.replace(/<!--[\s\S]*?(?:-->|$)/g, '');

  return withoutComments
    .split(/(<\/?[a-zA-Z][^>]*>)/)
    .map((part) => {
      if (!part.startsWith('<')) return escapeText(part);

      // Only bare tags: no attributes, no quotes, no stray characters.
      const match = part.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*\/?>$/);
      if (!match) return escapeText(part);

      const [, closing, rawName] = match;
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return escapeText(part);

      if (closing) return `</${name}>`;
      return name === 'br' ? '<br />' : `<${name}>`;
    })
    .join('');
}

export type SummaryBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Turns model output into renderable text blocks.
 *
 * Works on the raw string: only strict, attribute-free structural tags are treated as
 * structure, and every other character is carried through as text. The caller renders
 * those blocks through ordinary `{ ... }` interpolation, which escapes them, so markup
 * injected via chat messages can never become an element.
 */
const STRUCTURAL_TAG = /<(\/?)(h4|h5|ul|ol|li|p|br|strong|em)\b\s*\/?>/gi;

export function parseSummaryBlocks(input: string | undefined | null): SummaryBlock[] {
  if (!input) return [];

  const withoutComments = input.replace(/<!--[\s\S]*?(?:-->|$)/g, ' ');
  const parts = withoutComments.split(STRUCTURAL_TAG);

  const blocks: SummaryBlock[] = [];

  let openList: { kind: 'list'; items: string[] } | null = null;
  let openBlock: { kind: 'heading' | 'paragraph'; text: string } | null = null;
  let currentItem: string | null = null;

  const flushItem = () => {
    if (openList && currentItem !== null) {
      const text = decodeEntities(currentItem).replace(/\s+/g, ' ').trim();
      if (text) openList.items.push(text);
    }
    currentItem = null;
  };

  const flushBlock = () => {
    if (openBlock) {
      const text = decodeEntities(openBlock.text).replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ kind: openBlock.kind, text });
      openBlock = null;
    }
  };

  const flushList = () => {
    flushItem();
    if (openList && openList.items.length > 0) blocks.push(openList);
    openList = null;
  };

  const append = (value: string) => {
    if (currentItem !== null) currentItem += value;
    else if (openBlock) openBlock.text += value;
    else {
      // Bare text outside any tag still deserves to be shown.
      openBlock = { kind: 'paragraph', text: value };
    }
  };

  // split() with capture groups yields: text, slash, name, text, slash, name, ...
  for (let i = 0; i < parts.length; i += 3) {
    const text = parts[i];
    if (text) append(text);

    const closing = parts[i + 1];
    const rawName = parts[i + 2];
    if (!rawName) continue;

    const name = rawName.toLowerCase();

    if (closing === '/') {
      if (name === 'li') flushItem();
      if (name === 'ul' || name === 'ol') flushList();
      if (name === 'h4' || name === 'h5' || name === 'p') flushBlock();
      continue;
    }

    switch (name) {
      case 'ul':
      case 'ol': {
        flushBlock();
        flushList();
        openList = { kind: 'list', items: [] };
        break;
      }
      case 'li': {
        if (!openList) {
          flushBlock();
          flushList();
          openList = { kind: 'list', items: [] };
        }
        flushItem();
        currentItem = '';
        break;
      }
      case 'h4':
      case 'h5': {
        flushItem();
        flushList();
        flushBlock();
        openBlock = { kind: 'heading', text: '' };
        break;
      }
      case 'p': {
        flushItem();
        flushList();
        flushBlock();
        openBlock = { kind: 'paragraph', text: '' };
        break;
      }
      case 'br': {
        append('\n');
        break;
      }
      default:
        // strong/em are inline: keep the text, drop the emphasis.
        break;
    }
  }

  flushItem();
  flushList();
  flushBlock();

  return blocks;
}
