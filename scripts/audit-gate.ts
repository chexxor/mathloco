// Dependency audit gate.
//
// `npm audit` exits non-zero for ANY advisory, which makes it useless as a CI gate once an
// unavoidable advisory exists. This runs `npm audit --json`, then fails only on advisories
// that are not covered by the allowlist below. An allowlist entry names the *root cause*
// package; npm also reports each of its ancestors as vulnerable, and those are tolerated
// automatically as long as they carry no advisory of their own.
//
// Usage: npm run audit:gate  [-- --include-dev]

import { spawnSync } from 'node:child_process';

type Advisory = { title?: string; github_advisory_id?: string };
type Vuln = {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  range: string;
  /** Strings are other vulnerable packages this one inherits from; objects are its own advisories. */
  via: Array<string | Advisory>;
};

type AllowlistEntry = {
  /** Package name as it appears in `npm audit --json` output. */
  name: string;
  /** Highest severity tolerated for this package. */
  severity: 'low' | 'moderate' | 'high' | 'critical';
  /** Why it is tolerated, and what would make it fixable. */
  reason: string;
};

const ALLOWLIST: AllowlistEntry[] = [
  {
    name: 'deepmerge',
    severity: 'low',
    reason:
      'Prototype-pollution advisory reached through @sveltejs/vite-plugin-svelte -> ' +
      '@astrojs/svelte (npm reports all three; deepmerge is the only one with an advisory of its ' +
      'own). No patched release exists upstream, and npm\'s only remediation downgrades ' +
      '@astrojs/svelte to 0.1.2. Build-time tooling, not shipped code. Re-check when ' +
      '@sveltejs/vite-plugin-svelte drops deepmerge or ships a fixed release.',
  },
];

const RANK: Record<string, number> = { low: 1, moderate: 2, high: 3, critical: 4 };

const includeDev = process.argv.includes('--include-dev');
const result = spawnSync('npm', ['audit', '--json', ...(includeDev ? [] : ['--omit=dev'])], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

let vulns: Record<string, Vuln> = {};
try {
  const parsed = JSON.parse(result.stdout) as { vulnerabilities?: Record<string, Vuln> };
  vulns = parsed.vulnerabilities ?? {};
} catch {
  console.error('Could not parse `npm audit --json` output:\n', result.stdout || result.stderr);
  process.exit(2);
}

const ownAdvisories = (v: Vuln) => v.via.filter((x): x is Advisory => typeof x !== 'string');
const inheritedFrom = (v: Vuln) => v.via.filter((x): x is string => typeof x === 'string');

/** True when every advisory in this package's dependency cone is allowlisted. */
function tolerated(name: string, seen: Set<string>): boolean {
  const v = vulns[name];
  if (!v) return true; // not itself reported as vulnerable
  if (seen.has(name)) return true; // cycle guard

  seen.add(name);

  if (ownAdvisories(v).length > 0) {
    const entry = ALLOWLIST.find((a) => a.name === name);
    if (!entry || RANK[v.severity] > RANK[entry.severity]) return false;
  }

  return inheritedFrom(v).every((dep) => tolerated(dep, seen));
}

const names = Object.keys(vulns);
const unexpected = names.filter((name) => !tolerated(name, new Set()));

console.log(`audit scope: ${includeDev ? 'prod + dev' : 'prod (--omit=dev)'}`);
console.log(`${names.length} package(s) reported vulnerable`);

for (const entry of ALLOWLIST) {
  const present = Boolean(vulns[entry.name]);
  console.log(
    `  ${present ? 'tolerated' : 'no longer present'}: ${entry.name} (<= ${entry.severity}) - ${entry.reason}`,
  );
}

for (const name of names) {
  if (tolerated(name, new Set()) && ownAdvisories(vulns[name]).length === 0) {
    console.log(`  tolerated via dependency chain: ${name} (${vulns[name].severity})`);
  }
}

if (unexpected.length > 0) {
  console.error(`\n${unexpected.length} vulnerable package(s) not covered by the allowlist:`);
  for (const name of unexpected) {
    const advisories = ownAdvisories(vulns[name]);
    console.error(`  ${name}: ${vulns[name].severity} (${vulns[name].range})`);
    for (const advisory of advisories) {
      console.error(`    ${advisory.github_advisory_id ?? 'advisory'}: ${advisory.title ?? ''}`);
    }
  }
  console.error('\nFix by upgrading, or add a justified entry to ALLOWLIST in scripts/audit-gate.ts.');
  process.exit(1);
}

console.log('\naudit gate passed.');
