/**
 * content-slots.mjs — the two walks over `src/content.json` that both the site and its gate have to agree on.
 *
 * These used to be written twice: `openSlots`/`unsourcedSlots` in src/lib/content.ts (for components and
 * comments) and again as `openSlots`/`unsourced` in scripts/check-content.mjs (for the report). Two walks
 * over one file is how a new kind of slot gets seen by the punch list and missed by the gate — and the copy
 * in the gate had no array branch at all, so every claim inside a list (`threads.items`) was invisible to it.
 * `src/lib/content.ts` cannot be imported by a plain `node` script: it runs `import.meta.glob`, which only
 * Vite understands. So the walks live here, with no Vite in sight, and both sides import them (D118's
 * "one table" rule, applied to a traversal instead of a palette).
 *
 * A **slot** is an object with `value`. `value: null` is a hole (record 0010: a hole is a designed state,
 * never a blank and never a build failure); a `value` with no `source` anywhere above it is a claim the site
 * states without knowing where it came from (D92's defect class).
 *
 * Source **inheritance** is deliberate: a group of claims may name its source once, on the object that holds
 * the group — `threads.source` covers all nine items — because a source pasted nine times is a source that
 * goes out of date nine ways. `asOf` is NOT inherited: a date belongs to the claim it dates.
 */

export const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Every hole in the tree: what it is, what it is waiting to be told, and where. */
export const openSlots = (c) => {
  const out = [];
  const walk = (v, path) => {
    if (isObj(v)) {
      if ('value' in v && (v.value === null || v.value === '')) {
        out.push({
          path,
          placeholder: typeof v.placeholder === 'string' ? v.placeholder : null,
          requires: typeof v.requires === 'string' ? v.requires : null,
          source: typeof v.source === 'string' && v.source ? v.source : null,
        });
      }
      for (const [k, child] of Object.entries(v)) if (!k.startsWith('_')) walk(child, path ? `${path}.${k}` : k);
    } else if (Array.isArray(v)) v.forEach((child, i) => walk(child, `${path}[${i}]`));
  };
  walk(c, '');
  return out;
};

/** Every claim the tree states that cannot name a source at or above itself. */
export const unsourcedSlots = (c) => {
  const out = [];
  const walk = (v, path, inherited) => {
    if (isObj(v)) {
      const source = typeof v.source === 'string' && v.source !== '' ? v.source : inherited;
      if (typeof v.value === 'string' && v.value !== '' && !source) out.push({ path, value: v.value });
      for (const [k, child] of Object.entries(v)) if (!k.startsWith('_')) walk(child, path ? `${path}.${k}` : k, source);
    } else if (Array.isArray(v)) v.forEach((child, i) => walk(child, `${path}[${i}]`, inherited));
  };
  walk(c, '', null);
  return out;
};
