#!/usr/bin/env node
// capture.mjs — the material a blind reader is handed: every built page, at a desktop width and a
// phone width, as (a) what fits on one screen and (b) the whole page cut into screen-sized pieces.
//
//   node design/fresh-reader/capture.mjs --round=1 [--widths 1240:900,390:844] [--out=.design/fresh-reader/round-1]
//
// Why pieces and not one tall strip. The reference rig (`social-event-publisher`,
// `.notes/research/fresh-reader/capture.mjs`) wrote one full-page screenshot per page and its own
// written review of that round called the result out: a strip 13,338 px tall is not a thing an eye
// glances at, and a measurement taken on it is not the same measurement as one taken on screens. A
// person scrolls a page in screens, so the material is screens. The method goes beside the count in
// the round record, because a round measured on pieces is not comparable to a round measured on strips.
//
// Two passes per page per width, in the order the harness contract requires:
//   1. measure the settled page at a real viewport (w x viewportHeight) and shoot that window —
//      that shot IS the first screen, and the same load reports the page's own settled height;
//   2. shoot the whole document at `shotHeight(thatHeight, where)` — never `Math.min(cap, height)`.
//      If the page is taller than the cap this throws and names the width, the real height and the
//      cap (design/grill/shot-height.mjs, record 0015); the answer is bands, not a bigger number.
// The tall shot is then cut into pieces of exactly the viewport height with ImageMagick, and the
// last piece is the remainder (which may be shorter) rather than an overlapping final window: the
// pieces tile the document with no gap and no duplicate, and `manifest.json` prints each piece's y
// and height so a reader of the record can see the tiling.
//
// Nothing here mutates the artifact: `dist-measure.mjs` writes its own `.rel.css` / `rendered-*.html`
// copies inside dist and removes them, and every shot and word file this script writes lands under
// `.design/fresh-reader/round-N/` — scratch, per design/README.md, because re-running capture
// regenerates it and only the round's answer files are cited as evidence.
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { emittedRoutes } from "../emitted-routes.mjs";
import { builtPageFiles, decode, onePage, pageFileFor } from "../dist-pages.mjs";
import { distState, staleLine } from "../dist-fresh.mjs";
import { shotHeight } from "../grill/shot-height.mjs";

const arg = (name, dflt) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || `--${name}=${dflt}`).split("=").slice(1).join("=");
const ROUND = arg("round", "1");
const DIST = resolve(arg("dist", "dist/client"));
const OUT = resolve(arg("out", `.design/fresh-reader/round-${ROUND}`));
const MEASURE = resolve("design/fresh-reader/page-height-measure.js");

// width:viewportHeight pairs. 1240x900 and 390x844 are the pairs design/communication-survey.mjs
// already measures the first screen at, so "what fits on a screen" means the same two screens here.
const PAIRS = arg("widths", "1240:900,390:844").split(",").map((p) => {
  const [w, h] = p.split(":").map(Number);
  if (!w || !h) throw new Error(`--widths wants width:viewportHeight pairs, got "${p}"`);
  return { w, vh: h };
});

// distState takes the REPO ROOT and looks at dist/client + dist/server itself (design/dist-fresh.mjs),
// so a caller that passes it the dist directory is asking a different question than it means to.
const state = distState();
if (!state.fresh) throw new Error(`refusing to capture: ${staleLine(state)} — a round read against the previous branch's build measures a page that no longer exists`);

const routes = arg("routes", "") ? arg("routes", "").split(",") : emittedRoutes(DIST);
if (!routes.length) throw new Error(`no routes found under ${DIST} — run npm run build first`);

// ImageMagick is installed natively on this rig (/usr/bin/magick, /usr/bin/convert); name which one
// ran, because the crop is part of the method and the method goes in the record.
const IM = ["/usr/bin/magick", "/usr/bin/convert"].find((p) => existsSync(p));
if (!IM) throw new Error("no ImageMagick (/usr/bin/magick or /usr/bin/convert) — the crop into screen-sized pieces is the point of this script");

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "words"), { recursive: true });

const run = (args) => execFileSync(process.execPath, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
// A page that posted nothing must be named, not surfaced as a SyntaxError from JSON.parse: the
// failure the reader of this record needs is "which route never settled", and a firefox that exited
// without a report is the failure mode the render gate already knows about.
const jsonOf = (out, where) => {
  const a = out.indexOf("{"), b = out.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error(`${where}: the page posted no report at all — firefox exited without one (last output: ${out.slice(-300).trim() || "nothing"})`);
  try {
    return JSON.parse(out.slice(a, b + 1));
  } catch (e) {
    throw new Error(`${where}: the page posted something that is not a report (${e.message})`);
  }
};

/** The page's own words, the way a visitor sees them.
 *
 *  Round 1's word files carried MARKUP: `onePage().text` blanks comments, `<script>`, `<style>` and
 *  `<head>` at equal length but keeps every tag, so what that reader was handed said
 *  `aria-label="Dates 21 Nov, next meeting Saturday, Nov 21"` and `class="bg-paper text-ink"`. That
 *  contaminated the reading in two directions at once: it gave an unsighted reader information no visitor
 *  gets (an attribute that spells out the next meeting), and it made the reader read source, which is the
 *  one thing the persona says this person has never done. Round 1's Q7 - "words run together with no
 *  space" - is a real rendered defect (`calendar, and<a>` paints "andour"), but it was found off the
 *  source rather than off the page. So the tags come off here, and each round's record says which way the
 *  words were handed over. */
function visibleWords(html) {
  return decode(html)
    .replace(/<\/(p|h1|h2|h3|h4|li|figcaption|dd|dt|nav|section|footer|main|ul|ol|div|tr)>/g, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

const manifest = {
  generated: new Date().toISOString(),
  round: Number(ROUND),
  dist: DIST,
  distFiles: builtPageFiles(DIST).length,
  cropWith: IM,
  method: "first screen = one viewport-sized window; the page in pieces = the whole-document shot cut into viewportHeight pieces; no overlap and no gap; a tail under a quarter screen is folded into the previous piece (recorded as `extended`) rather than shipped as a sliver nobody can read",
  widths: PAIRS,
  wordsAre: "the built page's visible text, tags stripped (round 2 onward; round 1 was handed the marked-up page and the record says so)",
  pages: [],
};

const started = Date.now();
for (const route of routes) {
  const file = pageFileFor(route, DIST);
  const words = visibleWords(onePage(file, route).text ?? "");
  const slug = route === "/" ? "home" : route.replace(/^\//, "");
  writeFileSync(join(OUT, "words", `${slug}.txt`), `The page at ${route}\n\n${words}\n`);

  for (const { w, vh } of PAIRS) {
    const where = `${route} @ ${w}`;
    // pass 1: settled page in a real viewport, shot of that viewport = the first screen
    const m1 = jsonOf(run(["design/grill/dist-measure.mjs", DIST, route, MEASURE, String(w), String(vh), join(OUT, `${slug}-${w}-first.png`)]), `${where} @ ${w}x${vh}`);
    if (!m1.done) throw new Error(`${where} @ ${w}x${vh}: the page never reported done — refusing to build a round on an unsettled page`);
    const docH = shotHeight(m1.height, where);
    // pass 2: the whole document
    run(["design/grill/dist-measure.mjs", DIST, route, MEASURE, String(w), String(docH), join(OUT, `${slug}-${w}-full.png`)]);
    const dims = execFileSync(IM, ["identify", "-format", "%w %h", join(OUT, `${slug}-${w}-full.png`)], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
    if (dims[1] < docH) throw new Error(`${where}: the shot came back ${dims[1]}px for a ${docH}px document — the frame did not cover the page (record 0015)`);

    // Cut into pieces of vh. A remainder smaller than a quarter screen is folded into the previous
    // piece instead of becoming its own piece: `/past @ 1240` is 932px, and a 32px strip is the ink
    // footer — real content, but delivered as a sliver nobody can read. The fold keeps the tiling
    // complete (no gap, no duplicate) and the manifest records `extended` so the piece's true height
    // is visible beside the screen height it was meant to be.
    const bounds = [];
    for (let y = 0; y < dims[1]; y += vh) bounds.push({ y, h: Math.min(vh, dims[1] - y) });
    if (bounds.length > 1 && bounds.at(-1).h < vh * 0.25) {
      const tail = bounds.pop();
      const prev = bounds.at(-1);
      prev.h = tail.y + tail.h - prev.y;
      prev.extended = true;
    }
    const pieces = bounds.map((b, i) => {
      const f = `${slug}-${w}-seg-${String(i + 1).padStart(2, "0")}.png`;
      execFileSync(IM, [join(OUT, `${slug}-${w}-full.png`), "-crop", `${dims[0]}x${b.h}+0+${b.y}`, "+repage", join(OUT, f)]);
      return { file: f, y: b.y, h: b.h, ...(b.extended ? { extended: true } : {}) };
    });
    manifest.pages.push({ route, slug, width: w, viewportHeight: vh, docHeight: docH, shotHeight: dims[1], firstScreen: `${slug}-${w}-first.png`, fullStrip: `${slug}-${w}-full.png`, pieces, words: words.split(/\s+/).filter(Boolean).length, title: m1.title });
    console.log(`${route} @ ${w}: page ${docH}px -> first screen (${w}x${vh}) + ${pieces.length} piece(s) [${pieces.map((p) => p.h).join(", ")}], ${manifest.pages.at(-1).words} words`);
  }
}

const images = readdirSync(OUT).filter((f) => f.endsWith(".png"));
manifest.imageCount = images.length;
manifest.imageCountHanded = images.filter((f) => !f.endsWith("-full.png")).length; // the tall strip is evidence, not material
manifest.wordsFiles = readdirSync(join(OUT, "words")).length;
manifest.wallSeconds = (Date.now() - started) / 1000;
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`round ${ROUND}: ${manifest.pages.length} page x width cells, ${images.length} images (${manifest.imageCountHanded} handed over, the -full strips kept as evidence), ${manifest.wordsFiles} word files, ${manifest.wallSeconds.toFixed(1)}s -> ${OUT}`);
