// src/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { init } from '@paralleldrive/cuid2';

// Change id length from 24 to 12
const createId = init({
  length: 12,
});

export const user = sqliteTable("user", {
  // Primary Key
  id: text('id').$defaultFn(() => createId()).primaryKey(),

  // Core Fields
  username: text("username").notNull(),

  // Timestamp Fields
  created_dt: integer("created_dt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),

  modified_dt: integer("modified_dt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),

  deleted_dt: integer("deleted_dt", { mode: "timestamp_ms" }),
});
