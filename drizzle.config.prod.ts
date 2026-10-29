// Production target: d1-mathloco-prod-db, over the D1 HTTP API.
//
// Needs CLOUDFLARE_D1_ACCOUNT_ID, CLOUDFLARE_D1_API_TOKEN and DB_ID (see .drizzle.env.example).
// If any is missing this throws rather than opening a local file - the old config did exactly
// that, because `npm run db:studio:prod` set DB_ID but never NODE_ENV.
import { drizzleConfig } from './scripts/drizzle-config';

export default drizzleConfig('prod');
