// Config for `drizzle-kit check`, which compares src/schema.ts against migrations/ and talks to
// no database at all. It deliberately carries no credentials and never resolves the local SQLite
// file, because CI has no .wrangler state - a check config that tried to open a database would
// fail for the wrong reason there.
import { drizzleCheckConfig } from './scripts/drizzle-config';

export default drizzleCheckConfig();
