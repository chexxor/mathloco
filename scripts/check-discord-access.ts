// Discord access pre-flight check.
//
// Reads the same values the Worker uses (from .dev.vars and wrangler.toml's [vars]) and reports
// exactly what the app would see, without printing any secret and without printing message content.
//
//   npm run check:discord              # DISCORD_GUILD_ID: environment, then .dev.vars, then [vars]
//   npm run check:discord -- <guildId>
//
// Exit code 0 = the app can fetch and summarise; non-zero = at least one failure mode below.
// Note: package.json is not "type": "module", so this file must not use top-level await.

import { readFileSync, existsSync } from 'node:fs';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

type Var = 'DISCORD_TOKEN' | 'DISCORD_GUILD_ID' | 'CLAUDE_API_KEY';

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

const fail: string[] = [];

/**
 * Plain-text vars from wrangler.toml's `[vars]` table - the values the deployed Pages runtime
 * gets, and the ones local dev gets too. Deliberately minimal TOML: the `[vars]` table only, so
 * `[env.preview.vars]` is not mistaken for it, with inline `#` comments stripped. A TOML parser is
 * not worth a dependency for one id.
 */
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
    if (!inVars || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).split('#')[0].trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

async function main(): Promise<void> {
  const fileVars = readDevVars();
  const wranglerVars = readWranglerVars();
  const value = (name: Var) => process.env[name] || fileVars[name] || wranglerVars[name] || '';
  const sourceOf = (name: Var) =>
    process.env[name] ? 'environment' : fileVars[name] ? '.dev.vars' : wranglerVars[name] ? 'wrangler.toml [vars]' : 'nowhere';

  const token = value('DISCORD_TOKEN');
  const guildArg = process.argv.find((arg, index) => index >= 2 && !arg.startsWith('-'));
  const guildId = guildArg || value('DISCORD_GUILD_ID');

  if (!token) {
    console.error('DISCORD_TOKEN is not set (.dev.vars or the environment).');
    process.exit(1);
  }
  if (!guildId) {
    console.error(
      'DISCORD_GUILD_ID is not set (environment, .dev.vars, or wrangler.toml [vars]).',
    );
    process.exit(1);
  }

  console.log(`token: ${token.length} chars, guild under test: ${guildId} (from ${sourceOf('DISCORD_GUILD_ID')})`);

  const rest = new REST({ version: '10' }).setToken(token);

  // 1. Is the token a valid bot token at all?
  try {
    const botUser = (await rest.get(Routes.user('@me'))) as { id: string; username: string };
    console.log(`bot identity: ${botUser.username} (id ${botUser.id})`);
  } catch (error) {
    console.error('`GET /users/@me` failed:', (error as Error).message);
    console.error('  -> The token is not a valid bot token (an App/Client Secret will not work here).');
    process.exit(1);
  }

  // 2. Which guilds can this bot see, and is the configured one among them?
  try {
    const guilds = (await rest.get(Routes.userGuilds())) as Array<{ id: string; name: string }>;
    console.log(`guilds the bot is a member of: ${guilds.length}`);
    for (const guild of guilds) console.log(`  ${guild.id}  ${guild.name}`);

    if (!guilds.some((guild) => guild.id === guildId)) {
      fail.push(`DISCORD_GUILD_ID ${guildId} is not a guild this bot can see`);
      console.error(`\nDISCORD_GUILD_ID ${guildId} is not among them.`);
      if (guilds.length > 0) {
        console.error('This is what Discord reports as 10004 "Unknown Guild" — a guild the token');
        console.error('cannot access, not a guild that does not exist. Fix by inviting the bot to that');
        console.error('server (OAuth2 → URL Generator → scope `bot` → View Channels + Read Message');
        console.error('History), or by correcting DISCORD_GUILD_ID.');
      }
    }
  } catch (error) {
    fail.push("could not list the bot's guilds");
    console.error('`GET /users/@me/guilds` failed:', (error as Error).message);
  }

  // 3. Channels and message content — the Message Content Intent trap.
  if (fail.length === 0) {
    try {
      const channels = (await rest.get(Routes.guildChannels(guildId))) as Array<{
        id: string;
        name: string;
        type: number;
      }>;
      const textChannels = channels.filter((channel) => channel.type === 0);
      console.log(
        `channels: ${channels.length} total, ${textChannels.length} text (type 0 is what the app summarises)`,
      );

      let messagesSeen = 0;
      let emptyContent = 0;

      for (const channel of textChannels.slice(0, 5)) {
        const messages = (await rest.get(Routes.channelMessages(channel.id), {
          query: new URLSearchParams({ limit: '10' }),
        })) as Array<{ content: string }>;

        for (const message of messages) {
          messagesSeen += 1;
          if (!message.content || message.content.trim() === '') emptyContent += 1;
        }
        console.log(`  #${channel.name}: ${messages.length} recent messages`);
      }

      console.log(`recent messages inspected: ${messagesSeen}, empty content: ${emptyContent}`);
      if (messagesSeen > 0 && emptyContent === messagesSeen) {
        fail.push('every inspected message has empty content');
        console.error('\nAll message content came back empty: the bot can see the channels, but Discord');
        console.error('is withholding message text. Enable **Message Content Intent** in the Developer');
        console.error('Portal (Bot → Privileged Gateway Intents), then retry.');
        console.error('Without it, every summary reads "No summary available."');
      }
    } catch (error) {
      const err = error as { code?: number; message?: string };
      fail.push(`channel/message fetch failed: ${err.message}`);
      console.error('Channel/message fetch failed:', err.code, err.message);
    }
  }

  // 4. Claude key presence and shape only — no request, so no cost.
  const claudeKey = value('CLAUDE_API_KEY');
  if (!claudeKey) {
    fail.push('CLAUDE_API_KEY is not set');
    console.error('CLAUDE_API_KEY is not set.');
  } else {
    console.log(`CLAUDE_API_KEY: ${claudeKey.length} chars, prefix ${claudeKey.slice(0, 3)}***`);
  }

  if (fail.length > 0) {
    console.error(`\n${fail.length} problem(s):`);
    for (const reason of fail) console.error(`  - ${reason}`);
    process.exit(1);
  }

  console.log('\nDiscord + key pre-flight passed: the app should be able to build summaries.');
}

void main();
