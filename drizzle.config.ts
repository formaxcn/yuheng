import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env" });
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/yuheng';
const isSqlite = dbUrl.startsWith('file:');

if (isSqlite) {
    const dbPath = dbUrl.replace('file:', '');
    export default defineConfig({
        schema: "./lib/db/sqlite-schema.ts",
        out: "./drizzle/sqlite",
        dialect: "sqlite",
        dbCredentials: {
            url: dbPath,
        },
    });
} else {
    export default defineConfig({
        schema: "./lib/db/schema.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
            url: dbUrl,
        },
    });
}
