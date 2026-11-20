# Runbook: commissioning research

> Moved on 2026-11-20 (**MS40 P2**, **S083**, **D456**) from the host-local runbook home (the gitignored
> `.notes/runbooks/`) to `docs/howto/research-request.md`, where a path literal in this file has to resolve. A dated citation elsewhere
> in this repo that names the old home means the file here with the same name.

Read this before asking for external research (framework behaviour, upstream issue triage, a
platform limit). The failure mode it prevents is a confident answer from memory that quietly
invalidates a design decision.

## Before asking anything

1. **Pin the version you are actually on.** `npm ls <pkg>` or read the installed
   `node_modules/<pkg>/package.json`. Docs for the current upstream release are not docs for the
   version in `package.json`; this repo has already been bitten by config keys that a dependency
   version no longer reads (e.g. `grep -rn pages_build_output_dir node_modules/@astrojs/cloudflare/dist`
   returns nothing, which killed a plausible-sounding fix).
2. **Check whether the machine can answer.** Bundled `config-schema.json` files, `.d.ts` files and
   CLI `--help` settle a surprising amount without network or auth:
   `node_modules/wrangler/config-schema.json` for wrangler keys, `npx wrangler deploy --dry-run` for
   binding validation, `npx drizzle-kit <cmd> --help` for flags.

## What a research answer must contain

- The **exact installed version** the claim applies to.
- A **retrieved passage** - URL plus the quoted sentence - or the output of a command that was
  actually run. No passage, no claim: state the answer as a hypothesis and say what would test it.
- **Platform and OS**, when behaviour could differ (this rig runs native Linux and Windows; never
  `wsl` or `docker`).
- What was **not** checked, in one line.

## Where to look, in this order

1. The package's own bundled files (schema, types, `--help`, changelog in the tarball).
2. Upstream docs for that version tag, not `latest`.
3. Upstream issues/discussions, searching the exact error string.
4. Only then: general write-ups. Treat a blog post as a lead to verify, not as evidence.

## Handoff

Put the question, the pinned version, and the decision it feeds into `.notes/NEXT.md` before
starting, so a session that runs out of budget leaves the next one a question rather than a hunch.
