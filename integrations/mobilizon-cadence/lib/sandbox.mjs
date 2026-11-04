/**
 * lib/sandbox.mjs - the smallest honest n8n Code-node sandbox in this repo.
 *
 * One harness, used by every caller that has to agree about what a Code node does: `test/workflow.test.mjs`
 * (executes the Code nodes of the artifact this repo generated), `verify-import.mjs` (executes the config node
 * of a workflow *exported back out of n8n*), and `test/import.test.mjs` (runs such an export end to end and
 * requires the same two dates out of it). The rule it exists to enforce: the rehearsal and the verification run
 * the *same* harness, so a harness bug cannot make both of them agree.
 *
 * What it gives a Code node:
 *   $   a function naming a node -> { all(), item }   (the runOnceForAllItems reference form the nodes use)
 *   $json  the first item of the first named node, or undefined - none of this workflow's nodes read `$json`
 *          at top level, and if one ever does, it throws here rather than silently reading nothing.
 *
 * What it does not give, deliberately (each is a limit, stated so no caller mistakes the rehearsal for n8n):
 *   `$env`, `$vars`, `$now`, `$item`, `$input`, `$nodeVersion`, paired-item matching, item streaming,
 *   and per-item mode. `build-probe.mjs` writes the one node that touches `$env`, and it can only be
 *   exercised inside n8n - which is why the probe exists.
 */

/**
 * Run one Code node's body.
 *
 * @param {string} jsCode  the node's `parameters.jsCode`, exactly as the artifact carries it
 * @param {Record<string, Array<{json: unknown}>} itemsByName  what each named node emitted
 * @returns {unknown} whatever the node returns
 */
export function runCodeNode(jsCode, itemsByName) {
  const map = new Map(Object.entries(itemsByName ?? {}));
  const $ = (name) => {
    if (!map.has(name)) throw new Error(`node "${name}" did not run`);
    const items = map.get(name);
    return { all: () => items, item: items[0] };
  };
  const firstNode = [...map.values()][0] ?? [];
  return new Function("$", "$json", jsCode)($, firstNode[0]?.json);
}

/**
 * Execute the pieces of a workflow that do reasoning, in dependency order, and stop at the HTTP nodes.
 * Returns the emitted items keyed by node name, so a caller can ask "what would 08 Report print" without
 * any network and without a credential.
 *
 * @param {{nodes: Array<object>}} workflow
 * @param {Record<string, Array<{json: unknown}>}} seed  items for nodes that are *not* Code nodes (the HTTP
 *        responses a run would have received)
 */
/**
 * Which nodes the **main** chain reaches, from whatever has no inbound main edge (the trigger). Computed
 * rather than hard-coded, so an added or renamed node cannot slip past the harness.
 *
 * Why bother: `21 Report error path` and `22 Report a problem` are Code nodes too, and they **throw** when
 * handed no error - that is their design (see the workflow tests). Running every Code node in the document
 * would fail on the reporters; running the main chain is what a dry run is.
 */
export function mainChain(workflow) {
  const inbound = new Set();          // every inbound edge, main or error: what makes a node *not* a root
  for (const ports of Object.values(workflow.connections ?? {})) {
    for (const list of [...(ports.main ?? []), ...(ports.error ?? [])].flat()) if (list?.node) inbound.add(list.node);
  }
  const reached = new Set();
  // A root is a node nothing feeds - the trigger. `21 Report error path` has no inbound *main* edge either,
  // so without the error edges in `inbound` it would be mistaken for a root and run on a clean chain, where
  // its own code throws (correctly: it was handed no error).
  const queue = (workflow.nodes ?? []).filter((n) => !inbound.has(n.name)).map((n) => n.name);
  while (queue.length) {
    const name = queue.shift();
    if (reached.has(name)) continue;
    reached.add(name);
    for (const target of (workflow.connections?.[name]?.main ?? []).flat()) {
      if (target?.node && !reached.has(target.node)) queue.push(target.node);
    }
  }
  return [...reached];
}

/**
 * Execute the reasoning nodes of the main chain, in document order, stopping at the HTTP nodes. Returns the
 * emitted items keyed by node name, so a caller can ask "what would this copy print" with no network and no
 * credential. Nodes outside the main chain (the two error reporters) go in `skipped`, never run.
 *
 * @param {{nodes: Array<object>}} workflow
 * @param {Record<string, Array<{json: unknown}>}} seed  items for nodes that are *not* Code nodes (the HTTP
 *        responses a run would have received)
 */
export function runCodeChain(workflow, seed) {
  const inChain = new Set(mainChain(workflow));
  const emitted = { ...seed };
  const ran = [], skipped = [];
  for (const n of workflow.nodes) {
    if (!/^n8n-nodes-base\.code/.test(n.type)) continue;
    if (!inChain.has(n.name)) { skipped.push(n.name); continue; }
    emitted[n.name] = asItems(runCodeNode(n.parameters.jsCode, emitted));
    ran.push(n.name);
  }
  return { emitted, ran, skipped };
}

export const asItems = (v) => (Array.isArray(v) ? v : [v]);
