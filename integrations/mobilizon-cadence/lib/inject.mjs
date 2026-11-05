/**
 * lib/inject.mjs - the one implementation of "put a repo file's body inside a Code node's source".
 *
 * Every generator in this directory builds Code nodes by inlining `series.config.mjs`, `lib/core.mjs` and
 * `lib/queries.mjs` into them, because the alternative - typing the rules into the n8n editor - forks them into
 * a copy no test in this repo has ever run (D179). The rules of that inlining are load-bearing:
 *
 *   - `export` is the only word that has to go, so the injected text is byte-identical to the tested text;
 *   - two injections declaring the same top-level name in one node throw "Identifier has already been
 *     declared" at *execution* time in n8n, i.e. days later, so the collision is checked here instead;
 *   - a body that still contains ESM syntax would not parse in the sandbox;
 *   - the assembled node must parse (`new Function`), which is what catches a here-string that mangled a
 *     template literal.
 *
 * It lives here, rather than inside `build-workflow.mjs`, because there are now three generators (the cadence,
 * the error watcher, the weekly heartbeat) and a second copy of these checks is a second place to be wrong.
 */
import { readFileSync } from "node:fs";

export const READ = (base, rel) => readFileSync(new URL(rel, base), "utf8");

/** Strip the ESM keywords a Code node has no use for, leaving everything else byte-for-byte. */
export const STRIP = (src) =>
  src.replace(/^export (const|function|class|let|var)\s/gm, "$1 ")
     .replace(/^export\s*\{[^}]*\}\s*$/gm, "")
     .trim();

/**
 * Replace each `// @inject <name>` line with the named file's body.
 *
 * @param {string} nodeSource    the source from nodes/
 * @param {string} nodeLabel     the node's name, for the error messages
 * @param {Record<string,string>} injectables  name -> path, resolved relative to `base`
 * @param {URL} base             the directory the paths are relative to (usually `import.meta.url`)
 */
export function expand(nodeSource, nodeLabel, injectables, base) {
  const injectedNames = [];
  const body = nodeSource.replace(/^\/\/ @inject (\w+)\s*$/gm, (_m, what) => {
    const file = injectables[what];
    if (!file) throw new Error(`${nodeLabel}: unknown @inject "${what}" (known: ${Object.keys(injectables).join(", ")})`);
    const src = STRIP(READ(base, file));
    if (/^\s*(import|export)\s/m.test(src)) throw new Error(`${nodeLabel}: injected ${file} still has ESM syntax`);
    for (const m of src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/gm)) injectedNames.push([m[1], file]);
    return src;
  });
  const seen = new Set();
  for (const [name, file] of injectedNames) {
    if (seen.has(name)) throw new Error(`${nodeLabel}: "${name}" declared by two injections - a Code node would throw "already declared"`);
    seen.add(name);
  }
  try { new Function("$", body); } catch (e) {
    throw new Error(`${nodeLabel}: the generated Code node does not parse: ${e.message}`);
  }
  return body;
}

/**
 * Replace `// @literal <name>` with a `const <name> = <JSON>` line.
 *
 * This is how a generator passes a *value* (the alert channel, a marker) into a node without injecting the
 * whole config file. It exists because a watcher that carries the whole cadence config is a watcher that
 * carries the monitored host's name, its credentials' names, and every query - and the error watcher's whole
 * argument is that it depends on nothing but the alert channel (D206).
 */
export function literal(src, name, value, nodeLabel) {
  const line = new RegExp(`^// @literal ${name}\\s*$`, "m");
  if (!line.test(src)) throw new Error(`${nodeLabel}: no "// @literal ${name}" marker to fill in`);
  return src.replace(line, `const ${name} = ${JSON.stringify(value, null, 2)};`);
}
