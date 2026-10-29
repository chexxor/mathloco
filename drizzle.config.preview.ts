// Preview target: d1-mathloco-preview-db, over the D1 HTTP API.
//
// Needs CLOUDFLARE_D1_ACCOUNT_ID, CLOUDFLARE_D1_API_TOKEN and PREVIEW_DB_ID (see
// .drizzle.env.example). If any is missing this throws rather than falling back to the local
// file, which is what the old NODE_ENV check did.
import { drizzleConfig } from './scripts/drizzle-config';

export default drizzleConfig('preview');
