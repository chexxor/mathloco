import { drizzle } from 'drizzle-orm/d1';

export interface Env {
  DB: D1Database;
}

export default {
  async drizzle() {
    return drizzle(env.DB);
  },
};
