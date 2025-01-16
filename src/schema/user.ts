// src/schema/user.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { commonColumns } from "../schema";

export const user = sqliteTable("user", {
  username: text("username").notNull(),

  ...commonColumns,
});
