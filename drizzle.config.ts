import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env" });
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/yuheng';
const isSqlite = dbUrl.startsWith('file:');

const config = isSqlite
    ? defineConfig({
        schema: "./lib/db/sqlite-schema.ts",
        out: "./drizzle/sqlite",
        dialect: "sqlite",
        dbCredentials: {
            url: dbUrl.replace('file:', ''),
        },
    })
    : defineConfig({
        schema: "./lib/db/schema.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
            url: dbUrl,
        },
    });

export default config;
