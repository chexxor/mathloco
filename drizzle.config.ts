//drizzle.config.ts
import type { Config } from 'drizzle-kit';


import fs from "fs";
import path from "path";

const { CLOUDFLARE_D1_ACCOUNT_ID, CLOUDFLARE_D1_API_TOKEN, DB_ID } = process.env;


const getLocalD1 = () => {
    try {
        const basePath = path.resolve('.wrangler');
        const dbFile = fs
            .readdirSync(basePath, { encoding: 'utf-8', recursive: true })
            .find((f) => f.endsWith('.sqlite'));

        if (!dbFile) {
            throw new Error(`.sqlite file not found in ${basePath}`);
        }

        const url = path.resolve(basePath, dbFile);
        return url;
    } catch (err) {
        console.log(`Error  ${err}`);
    }
}

const isProd = () => process.env.NODE_ENV === 'production'

const getCredentials = () => {
    const prod = {
        driver: 'd1-http',
        out: "./migrations",
        dbCredentials: {
            accountId: CLOUDFLARE_D1_ACCOUNT_ID,
            databaseId: DB_ID,
            token: CLOUDFLARE_D1_API_TOKEN
        },

    }

    const dev = {
        dbCredentials: {
            url: getLocalD1()
        }
    }
    return isProd() ? prod : dev

}

// Wrangler looks for the migrations in the migrations folder.
export default {
    schema: './src/schema.ts',
    out: './migrations',
    dialect: "sqlite",
    ...getCredentials()
} satisfies Config;
