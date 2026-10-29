/**
 * Adversarial checks for src/lib/sanitize.ts, which guards the Discord summary that the
 * page renders. Run with: npm run check:sanitize
 */
import { parseSummaryBlocks, sanitizeSummaryHtml } from '../src/lib/sanitize';
import type { SummaryBlock } from '../src/lib/sanitize';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Mirrors how DiscordSummary.svelte renders blocks: structure is ours, text is escaped. */
function renderBlocks(blocks: SummaryBlock[]): string {
  return blocks
    .map((block) => {
      if (block.kind === 'heading') return `<h4>${escapeHtml(block.text)}</h4>`;
      if (block.kind === 'paragraph') return `<p>${escapeHtml(block.text)}</p>`;
      return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    })
    .join('');
}

const cases: [string, string][] = [
  ['<h4>Topics</h4><ul><li>Category theory</li><li>Topo<span>logy</span></li></ul>', 'normal model output'],
  ['<img src=x onerror=alert(1)>', 'img injection'],
  ['<script>alert(document.cookie)</script>', 'script injection'],
  ['<a href="javascript:alert(1)" onclick="x()">click</a>', 'attribute injection'],
  ['<li title="x">quoted</li>', 'quoted attribute'],
  ['<<marquee>evil</marquee>', 'nested angle brackets'],
  ['<!-- comment --><ul><li>ok</li></ul>', 'html comment'],
  ['<h4>Top</h4><ul><li>a &amp; b</li><li>5 < 6 &gt; 4</li></ul>', 'entity handling'],
  ['plain text with no tags', 'bare text'],
  ['<p>line1<br />line2</p>', 'paragraph with br'],
  ['<ul><li>unclosed', 'unclosed list'],
  ['<h4>Sneaky</h4><script src="https://evil/x.js"></script><ul><li><img src=1 onerror=bad()></li></ul>', 'mixed injection'],
  ['<h4>x</h4><ul><li><a href="https://evil">link</a></li></ul>', 'link inside item'],
  ['<svg><animate onbegin=alert(1) attributeName=x dur=1s></svg>', 'svg animation'],
  ['<ul><li>dupe</li><li>dupe</li></ul>', 'duplicate items'],
  ['<h4></h4><ul></ul>', 'empty blocks'],
  ['</li></ul>stray closers<ul><li>real</li></ul>', 'stray closing tags'],
];

const ALLOWED_RENDERED = new Set(['h4', 'p', 'ul', 'li']);
const SANITIZE_ALLOWED = new Set(['h4', 'h5', 'ul', 'ol', 'li', 'p', 'strong', 'em', 'br']);
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

let failures = 0;
for (const [input, label] of cases) {
  const sanitized = sanitizeSummaryHtml(input);
  const blocks = parseSummaryBlocks(input);
  const rendered = renderBlocks(blocks);

  const problems: string[] = [];
  // sanitizeSummaryHtml is the defence for any consumer that renders HTML: it must
  // leave only bare allowlisted tags behind.
  for (const match of sanitized.matchAll(TAG_RE)) {
    if (!SANITIZE_ALLOWED.has(match[1].toLowerCase())) {
      problems.push(`sanitizer left element <${match[1]}>`);
    }
    if (match[0].length > 0 && /[^<>\s\/]/.test(match[0].replace(/^<\/?[a-zA-Z0-9]+/, '').replace(/\/>?$/, ''))) {
      problems.push(`sanitizer left attributes in ${match[0]}`);
    }
  }

  for (const match of rendered.matchAll(TAG_RE)) {
    if (!ALLOWED_RENDERED.has(match[1].toLowerCase())) {
      problems.push(`unexpected element <${match[1]}> in rendered HTML`);
    }
  }
  if (/<[a-zA-Z][^>]*\bon[a-z]+\s*=/i.test(rendered)) problems.push('event handler attribute in rendered HTML');
  if (/href\s*=\s*["']?javascript:/i.test(rendered)) problems.push('javascript: URL in rendered HTML');
  for (const block of blocks) {
    if (block.kind !== 'list' && (block.text.includes('<') || block.text.includes('>'))) {
      // angle brackets in text are fine as long as renderBlocks escapes them
      if (!rendered.includes('&lt;')) problems.push(`unescaped angle bracket in text: ${block.text}`);
    }
  }

  const status = problems.length ? 'FAIL' : 'ok  ';
  if (problems.length) failures++;
  console.log(`[${status}] ${label}\n   in : ${input}\n   san: ${sanitized}\n   out: ${JSON.stringify(blocks)}\n   html: ${rendered}`);
  for (const p of problems) console.log(`   !! ${p}`);
}

// A well-formed summary must survive intact.
const good = parseSummaryBlocks('<h4>Topics</h4><ul><li>a &amp; b</li><li>c</li></ul>');
const expected: SummaryBlock[] = [
  { kind: 'heading', text: 'Topics' },
  { kind: 'list', items: ['a & b', 'c'] },
];
const roundTripOk = JSON.stringify(good) === JSON.stringify(expected);
console.log(`\n[${roundTripOk ? 'ok  ' : 'FAIL'}] well-formed summary survives round trip`);
console.log(`   ${JSON.stringify(good)}`);
if (!roundTripOk) failures++;

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
