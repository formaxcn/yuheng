import { IDatabaseAdapter } from './interface';
import { PostgresAdapter } from './postgres';
import { logger } from '../logger';

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
                const DEFAULT_MEAL_CONFIG = [
                    { name: "Breakfast", start: 6, end: 10, default: "08:00" },
                    { name: "Lunch", start: 10, end: 14, default: "12:00" },
                    { name: "Dinner", start: 17, end: 19, default: "18:00" }
                ];
                await activeAdapter.saveSetting('meal_times', JSON.stringify(DEFAULT_MEAL_CONFIG));
            }

            const existingTargets = await activeAdapter.getSetting('daily_targets');
            if (!existingTargets) {
                const DEFAULT_DAILY_TARGETS = { energy: 2000, protein: 150, carbs: 200, fat: 65 };
                await activeAdapter.saveSetting('daily_targets', JSON.stringify(DEFAULT_DAILY_TARGETS));
            }

            const existingUnitPrefs = await activeAdapter.getSetting('unit_preferences');
            if (!existingUnitPrefs) {
                await activeAdapter.saveSetting('unit_preferences', JSON.stringify({ energy: 'kcal', weight: 'g' }));
            }

            const defaults = [
                { key: 'recognition_language', val: 'zh' },
                { key: 'region', val: 'CN' },
                { key: 'time_format', val: '24h' },
                { key: 'other_meal_name', val: 'Snack' },
                { key: 'llm_provider', val: 'gemini' },
                { key: 'llm_model', val: 'gemini-1.5-flash' },
                { key: 'llm_base_url', val: '' }
            ];

            for (const item of defaults) {
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
