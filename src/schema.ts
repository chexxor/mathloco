// schema.ts
import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";
import { init } from '@paralleldrive/cuid2';

// Change id length from 24 to 12
const createId = init({
  length: 12,
});

const commonColumns = {
  // Primary Key
  id: text('id').$defaultFn(() => createId()).primaryKey(),

  // Timestamp Fields
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),

  modifiedAt: integer("modified_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .$onUpdateFn(() => new Date()),

  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
}

export { commonColumns };
