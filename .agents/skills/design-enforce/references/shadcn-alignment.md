# shadcn/ui Alignment

shadcn/ui copies each component's source into the repo, where it gets edited like any other file. Over time the copies drift away from the originals and from each other. Anything inside `ui/` affects every place that component is used.

Only do this if `components.json` exists.

## 1. Fix components.json

```bash
cat components.json
```

Check each field against the project:

| Field | Should be |
|---|---|
| `tailwind.config` | the real path to the Tailwind config, or an empty string on v4 |
| `tailwind.css` | the CSS file the tokens were written to |
| `tailwind.baseColor` | the gray the tokens use |
| `tailwind.cssVariables` | `true` |
| `aliases.*` | paths that actually exist |
| `rsc` / `tsx` | settings that match the framework |

Fix `cssVariables` first if it's `false`. While it's false, every component you add is generated with hard-coded Tailwind colors instead of your tokens, which skips the design system completely.

## 2. Check the installed components

```bash
ls src/lib/components/ui 2>/dev/null || ls components/ui 2>/dev/null
```

Check three things.

**Hard-coded values.** Components in `ui/` should only use named roles, never raw colors or sizes.

```bash
npm run design-lint -- --json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f['file'], f['line'], f['msg']) for f in d['findings'] if '/ui/' in f['file']]"
```

**Local edits.** Compare each component with a fresh copy from shadcn:

```bash
npx shadcn@latest add button --path /tmp/shadcn-ref --yes 2>/dev/null
diff -u /tmp/shadcn-ref/button.tsx src/lib/components/ui/button/button.svelte 2>/dev/null
```

Sort each difference into one of two groups: a deliberate change the project wants, which gets written into `DESIGN.md`, or an undocumented edit, which gets changed back to use the token.

**Variants.** Read each component's `cva` or `tv` definition (the list of variants like `default`, `ghost` or `sm`). Every variant should match a decision from round 4 (components) of `design-grill`. An extra size variant nobody decided on is really an extra spacing value.

## 3. Replace hand-built duplicates

Find components someone built by hand that do the same job as an installed shadcn component:

```bash
grep -rln "class=.*rounded.*px-.*py-" src --include="*.svelte" --include="*.tsx" \
  | grep -v "/ui/" | head -20
```

Replace them with the shadcn component. Don't just convert their values to tokens.

## 4. Treat problems in ui/ as errors

Add this to `.design/lint.config.json`:

```json
{
  "shadcn": {
    "uiPath": "src/lib/components/ui",
    "requireCssVariables": true,
    "allowedVariants": { "button": ["default", "secondary", "ghost", "destructive", "outline", "link"] }
  }
}
```

Treat findings inside `ui/` as errors, even for rules that are only warnings elsewhere.

## Report

List the `components.json` fields you fixed, the components you checked, hard-coded values found in `ui/`, local edits split into deliberate and undocumented, variants nobody decided on, and duplicate components you replaced. Say which edits you reverted and which you wrote into `DESIGN.md`.
