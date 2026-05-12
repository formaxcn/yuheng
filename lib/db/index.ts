import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { IDatabaseAdapter } from './interface';
import { PostgresAdapter } from './postgres';
import { SqliteAdapter } from './sqlite';
import { logger } from '../logger';
import {
    DEFAULT_MEAL_CONFIG,
    DEFAULT_DAILY_TARGETS,
    DEFAULT_UNIT_PREFERENCES,
    DEFAULT_SETTINGS
} from '../constants';
import { DEFAULT_USER_ID } from './user-context';

let adapter: IDatabaseAdapter | null = null;
let initPromise: Promise<void> | null = null;

export function isSqlite(): boolean {
    const url = process.env.DATABASE_URL || '';
    return url.startsWith('file:');
}

export function getAdapter(): IDatabaseAdapter {
    if (adapter) return adapter;

    if (isSqlite()) {
        adapter = new SqliteAdapter();
    } else {
        adapter = new PostgresAdapter();
    }
    return adapter;
}

export async function getSetting(key: string, userId?: string): Promise<string | undefined> {
    return getAdapter().getSetting(key, userId);
}

export async function saveSetting(key: string, value: string, userId?: string): Promise<void> {
    return getAdapter().saveSetting(key, value, userId);
}

async function runMigrations(): Promise<void> {
    if (!process.env.DATABASE_URL) {
        logger.warn('DATABASE_URL not set, skipping migrations');
        return;
    }

    try {
        if (isSqlite()) {
            // SQLite migrations
            const dbPath = process.env.DATABASE_URL.replace('file:', '');

            // Ensure directory exists
            const fs = require('fs');
            const path = require('path');
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            const sqlite = new Database(dbPath);
            const db = drizzleSqlite(sqlite);

            logger.info('Running SQLite migrations...');
            await migrateSqlite(db, { migrationsFolder: 'drizzle/sqlite' });
            logger.info('SQLite migrations completed successfully');
            sqlite.close();
        } else {
            // PostgreSQL migrations
            const { default: postgres } = await import('postgres');
            const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
            const db = drizzlePg(migrationClient);

            logger.info('Running PostgreSQL migrations...');
            await migratePg(db, { migrationsFolder: 'drizzle/pg' });
            logger.info('PostgreSQL migrations completed successfully');

            await migrationClient.end();
        }
    } catch (error) {
        logger.error(error, 'Failed to run migrations');
        throw error;
    }
}

export async function ensureInit() {
    if (!initPromise) {
        const activeAdapter = getAdapter();
        initPromise = runMigrations()
            .then(() => activeAdapter.init())
            .then(async () => {
                // Create default user if not exists
                const defaultUser = await activeAdapter.getUser(DEFAULT_USER_ID);
                if (!defaultUser) {
                    logger.info('Creating default user...');
                    await (activeAdapter as any).createDefaultUser();
                }

                const existingMealConfig = await activeAdapter.getSetting('meal_times', DEFAULT_USER_ID);
                if (!existingMealConfig) {
                    await activeAdapter.saveSetting('meal_times', JSON.stringify(DEFAULT_MEAL_CONFIG), DEFAULT_USER_ID);
                }

                const existingTargets = await activeAdapter.getSetting('daily_targets', DEFAULT_USER_ID);
                if (!existingTargets) {
                    await activeAdapter.saveSetting('daily_targets', JSON.stringify(DEFAULT_DAILY_TARGETS), DEFAULT_USER_ID);
                }

                const existingUnitPrefs = await activeAdapter.getSetting('unit_preferences', DEFAULT_USER_ID);
                if (!existingUnitPrefs) {
                    await activeAdapter.saveSetting('unit_preferences', JSON.stringify(DEFAULT_UNIT_PREFERENCES), DEFAULT_USER_ID);
                }

                for (const item of DEFAULT_SETTINGS) {
                    const existing = await activeAdapter.getSetting(item.key, DEFAULT_USER_ID);
                    if (!existing) await activeAdapter.saveSetting(item.key, item.val, DEFAULT_USER_ID);
                }
            }).catch((error) => {
                logger.error(error, 'Database initialization failed');
                initPromise = null;
                throw error;
            });
    }
    await initPromise;
}

export const db = {
    getSetting: (key: string, userId?: string) => getAdapter().getSetting(key, userId),
    saveSetting: (key: string, value: string, userId?: string) => getAdapter().saveSetting(key, value, userId),
} as any;
export * from './types';
export * from './interface';
export * from './user-context';

