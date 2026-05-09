import { IDatabaseAdapter } from './interface';
import { PostgresAdapter } from './postgres';
import { logger } from '../logger';
import {
    DEFAULT_MEAL_CONFIG,
    DEFAULT_DAILY_TARGETS,
    DEFAULT_UNIT_PREFERENCES,
    DEFAULT_SETTINGS
} from '../constants';

let adapter: IDatabaseAdapter | null = null;
let initPromise: Promise<void> | null = null;

export function getAdapter(): IDatabaseAdapter {
    if (adapter) return adapter;

    adapter = new PostgresAdapter();
    return adapter;
}

export async function ensureInit() {
    if (!initPromise) {
        const activeAdapter = getAdapter();
        initPromise = activeAdapter.init().then(async () => {
            const existingMealConfig = await activeAdapter.getSetting('meal_times');
            if (!existingMealConfig) {
                await activeAdapter.saveSetting('meal_times', JSON.stringify(DEFAULT_MEAL_CONFIG));
            }

            const existingTargets = await activeAdapter.getSetting('daily_targets');
            if (!existingTargets) {
                await activeAdapter.saveSetting('daily_targets', JSON.stringify(DEFAULT_DAILY_TARGETS));
            }

            const existingUnitPrefs = await activeAdapter.getSetting('unit_preferences');
            if (!existingUnitPrefs) {
                await activeAdapter.saveSetting('unit_preferences', JSON.stringify(DEFAULT_UNIT_PREFERENCES));
            }

            for (const item of DEFAULT_SETTINGS) {
                const existing = await activeAdapter.getSetting(item.key);
                if (!existing) await activeAdapter.saveSetting(item.key, item.val);
            }
        }).catch((error) => {
            logger.error(error, 'Database initialization failed');
            initPromise = null;
            throw error;
        });
    }
    await initPromise;
}
