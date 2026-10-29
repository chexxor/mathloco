// Local target: the SQLite file wrangler keeps local D1 state in.
//
// This is drizzle-kit's default config, so a bare `npx drizzle-kit <cmd>` and `npm run
// db:generate` use it. Targets are separate config files rather than NODE_ENV sniffing - see
// the header of scripts/drizzle-config.ts for why.
import { drizzleConfig } from './scripts/drizzle-config';

export default drizzleConfig('local');
