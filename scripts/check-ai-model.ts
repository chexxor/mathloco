// AI model pre-flight check: does the configured model id actually resolve?
//
// This exists because production served "Unable to generate summary at this time." for weeks:
// `claude-3-haiku-20240307` had been retired, so every upstream call returned 404, and nothing in
// the repo could tell us that. `npm run check:discord` proves the Discord side; this proves the
// model side. It makes exactly one tiny call, prints token usage, and never prints a secret.
//
//   npm run check:ai                                  # model as the app would resolve it
//   npm run check:ai -- claude-haiku-5-5              # probe a specific id
//   CLAUDE_MODEL=some-other-model npm run check:ai     # same, via env
//
// Deliberately NOT in CI: it needs a real CLAUDE_API_KEY and spends a request. Run it by hand
// before a production deploy, and after any Anthropic deprecation notice.
//
// Note: package.json is not "type": "module", so this file must not use top-level await.

import { readFileSync, existsSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = 'claude-haiku-5-5';
const DEPRECATIONS = 'https://platform.claude.com/docs/en/about-claude/model-deprecations';

/** Minimal .dev.vars parser: KEY=value, `#` comments, optional quotes. Values are never logged. */
function readDevVars(): Record<string, string> {
  const path = '.dev.vars';
  if (!existsSync(path)) return {};

  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

/** Plain-text vars from wrangler.toml's `[vars]` table only - see check-discord-access.ts. */
function readWranglerVars(): Record<string, string> {
  const path = 'wrangler.toml';
  if (!existsSync(path)) return {};

  const out: Record<string, string> = {};
  let inVars = false;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      inVars = trimmed === '[vars]';
      continue;
    }
    if (!inVars) continue;
    const withoutComment = trimmed.replace(/\s+#.*$/, '');
    const eq = withoutComment.indexOf('=');
    if (eq === -1) continue;
    const key = withoutComment.slice(0, eq).trim();
    const value = withoutComment.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

function resolveModel(): { model: string; source: string } {
  const cli = process.argv[2];
  if (cli) return { model: cli, source: 'command line argument' };

  if (process.env.CLAUDE_MODEL) return { model: process.env.CLAUDE_MODEL, source: 'environment' };

  const devVars = readDevVars();
  if (devVars.CLAUDE_MODEL) return { model: devVars.CLAUDE_MODEL, source: '.dev.vars' };

  const vars = readWranglerVars();
  if (vars.CLAUDE_MODEL) return { model: vars.CLAUDE_MODEL, source: 'wrangler.toml [vars]' };

  return { model: DEFAULT_MODEL, source: `DEFAULT_MODEL in ${__filename}` };
}

async function main(): Promise<void> {
  const devVars = readDevVars();
  const key = process.env.CLAUDE_API_KEY || devVars.CLAUDE_API_KEY || '';
  if (!key) {
    console.error('FAIL: no CLAUDE_API_KEY in the environment or .dev.vars.');
    console.error('This probe needs real credentials; it is not in CI for that reason.');
    process.exit(2);
  }

  const { model, source } = resolveModel();
  console.log(`model id:   ${model}`);
  console.log(`source:     ${source}`);
  console.log(`api key:    ${key.length} chars, prefix ${key.slice(0, 6)}***`);

  const client = new Anthropic({ apiKey: key, timeout: 30_000, maxRetries: 1 });
  const started = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with exactly this word and nothing else: Pong' }],
    });

    const elapsed = Date.now() - started;
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    console.log(`resolved:   ${response.model}`);
    console.log(`reply:      ${JSON.stringify(text)}`);
    console.log(`usage:      ${response.usage.input_tokens} input tokens, ${response.usage.output_tokens} output tokens`);
    console.log(`latency:    ${elapsed} ms`);

    if (!text) {
      console.error('FAIL: the model resolved but returned no text block - same shape as the outage.');
      process.exit(1);
    }
    console.log('\nPASS: the configured model resolves and returns text.');
  } catch (error) {
    const elapsed = Date.now() - started;
    console.error(`\nrequest failed after ${elapsed} ms`);

    if (error instanceof Anthropic.APIError) {
      console.error(`status:     ${error.status}`);
      console.error(`message:    ${error.message}`);
      if (error.status === 404) {
        console.error(`\nThe model id does not resolve. It is retired, renamed, or mistyped.`);
        console.error(`This is the exact failure that made prod print "Unable to generate summary at this time."`);
        console.error(`Pick a current id: ${DEPRECATIONS}`);
      }
      if (error.status === 401) {
        console.error('The key was rejected - check CLAUDE_API_KEY, not the model id.');
      }
      if (error.status === 429) {
        console.error('Rate limited. The id resolved; the account is out of budget for this minute.');
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

void main();
