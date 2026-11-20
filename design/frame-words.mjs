#!/usr/bin/env node
/**
 * frame-words.mjs — how many sentences in the built artifact characterize the club's *temperament*,
 * and does anything in `src/content.json` back the word it uses. A **probe, not a gate** (S082, D454).
 *
 * Why it exists. On 2026-11-19 the operator deleted the hero's "Most of the arguing happens in the chat
 * between meetings." with a reason about the club, not about the sentence: "we don't argue or debate, it's
 * more of a collaborate environment of exploration". The sentence had no slot: it arrived as an instruction
 * in a seat's review letter and was typed into a component. No check in the rig distinguishes a claim that
 * came from the author through `src/content.json` from one that came from a seat through a review letter -
 * `check:content`'s cadence rule does exactly that for **frequency** words (D92, D301: a word is allowed only
 * when the source *names that word*), and nothing does it for words about how the club behaves. This probe is
 * the cost of such a rule, measured over the artifact rather than argued: it prints every frame word that
 * reaches a visitor, which slot paints it, and whether that slot's `source` names the word.
 *
 * What it is NOT. It does not decide whether a word is true, and it exits 0 whatever it finds - a lexicon
 * nobody has ratified cannot be a gate (the same reasoning that keeps `check:area`/`check:rhythm` out of
 * `verify`). If the operator picks a frame gate, the lexicon below is the starting vocabulary and this file is
 * where it lives.
 *
 * Read the artifact, not `src/`: a word in a template literal is escaped on the way out, and a comment inside
 * a component is not a thing a visitor reads (`<!-- -->` is stripped here for exactly that reason - the footer's
 * mark note contains the word "argument" and no visitor ever sees it).
 *
 * Usage: node design/frame-words.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Characterization vocabulary: how a page says the club works, not what it does. Deliberately small;
 *  every word in it is one a future round could type without a source behind it. */
export const FRAME_WORDS =
  /\b(argu(?:e|es|ed|ing|ment|ments)|debate(?:s|d)?|disput\w*|compet\w*|rigor\w*|serious(?:ly)?|passion\w*|collaborat\w*|explor\w*|curious|curiosity|brainstorm\w*)\b/gi;

/** Slot values and their sources, flattened, so a painted word can be traced back to a grant. */
const slotEntries = (content) => {
  const out = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === 'object') {
      if (typeof v.value === 'string') out.push({ path, value: v.value, source: String(v.source ?? '') });
      for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(content, '');
  return out;
};

const norm = (s) =>
  String(s).replace(/&#39;|&apos;|&rsquo;|&ldquo;|&rdquo;|\\u0027/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const htmlFiles = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
};

const visible = (file) =>
  norm(
    readFileSync(file, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  );

export const frameHits = ({ dist = 'dist/client', contentFile = 'src/content.json' } = {}) => {
  let slots;
  try {
    slots = slotEntries(JSON.parse(readFileSync(contentFile, 'utf8')));
  } catch (e) {
    throw new Error(`frame-words: cannot read slots from ${contentFile} — ${e.message}. Run it from the repo root; it opens src/content.json and dist/client by relative path.`);
  }
  const hits = [];
  for (const f of htmlFiles(dist)) {
    const text = visible(f);
    for (const m of text.matchAll(new RegExp(FRAME_WORDS.source, 'gi'))) {
      const word = m[1].toLowerCase();
      const slot = slots.find((s) => norm(s.value).includes(m[1]));
      const rel = f.slice(dist.length + 1);
      const route = rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '').replace(/^404\.html$/, '404');
      hits.push({
        route,
        word,
        slot: slot ? slot.path : null,
        sourceNamesWord: slot ? new RegExp(`\\b${m[1]}\\b`, 'i').test(slot.source) : false,
        context: text.slice(Math.max(0, m.index - 60), m.index + 70),
      });
    }
  }
  return hits;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const hits = frameHits();
  const unbacked = hits.filter((h) => !h.sourceNamesWord);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ total: hits.length, unbacked: unbacked.length, hits }, null, 2));
  } else {
    console.log(`frame words in visible text: ${hits.length} (${unbacked.length} whose slot source does not name the word)`);
    for (const h of hits) {
      console.log(`${h.route}  "${h.word}"  slot=${h.slot ?? 'NONE - hardcoded prose'}  source-names-word=${h.sourceNamesWord}`);
      console.log(`     …${h.context}…`);
    }
    console.log('\nThis is a price list for a rule, not a verdict. A word with no slot behind it was written by');
    console.log('whoever edited the component; a word whose slot source does not name it is the D301 shape');
    console.log('(a source for one claim standing in for another).');
  }
}
