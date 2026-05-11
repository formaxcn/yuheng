import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { IDatabaseAdapter } from './interface';
import { PostgresAdapter } from './postgres';
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

export function getAdapter(): IDatabaseAdapter {
    if (adapter) return adapter;

    adapter = new PostgresAdapter();
    return adapter;
}

async function runMigrations(): Promise<void> {
    if (!process.env.DATABASE_URL) {
        logger.warn('DATABASE_URL not set, skipping migrations');
        return;
    }

    try {
        // Use a separate connection for migrations
        const { default: postgres } = await import('postgres');
        const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
        const db = drizzle(migrationClient);

        logger.info('Running database migrations...');
        await migrate(db, { migrationsFolder: 'drizzle' });
        logger.info('Migrations completed successfully');

        await migrationClient.end();
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
                    await (activeAdapter as PostgresAdapter).createDefaultUser();
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

export const db = getAdapter();
export * from './types';
export * from './interface';
export * from './user-context';

