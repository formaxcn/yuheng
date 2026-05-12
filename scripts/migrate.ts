import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import postgres from "postgres";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const isSqlite = () => {
    const url = process.env.DATABASE_URL || '';
    return url.startsWith('file:');
};

const runMigrate = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }

    if (isSqlite()) {
        // SQLite migration
        const dbPath = process.env.DATABASE_URL.replace('file:', '');

        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        console.log("⏳ Starting SQLite migration...");
        const sqlite = new Database(dbPath);
        const db = drizzleSqlite(sqlite);

        try {
            await migrateSqlite(db, { migrationsFolder: "drizzle/sqlite" });
            console.log("✅ SQLite migration completed successfully");
        } catch (error) {
            console.error("❌ SQLite migration failed:", error);
            process.exit(1);
        } finally {
            sqlite.close();
        }
    } else {
        // PostgreSQL migration
        console.log("⏳ Starting PostgreSQL migration...");
        const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
        const db = drizzlePg(migrationClient);

        try {
            await migratePg(db, { migrationsFolder: "drizzle/pg" });
            console.log("✅ PostgreSQL migration completed successfully");
        } catch (error) {
            console.error("❌ PostgreSQL migration failed:", error);
            process.exit(1);
        } finally {
            await migrationClient.end();
        }
    }
};

runMigrate();
