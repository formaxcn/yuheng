import { IDatabaseAdapter } from './interface';
import { SQLiteAdapter } from './sqlite';
import { PostgresAdapter } from './postgres';
import { logger } from '../logger';

let adapter: IDatabaseAdapter | null = null;
let initPromise: Promise<void> | null = null;

export function getAdapter(): IDatabaseAdapter {
    if (adapter) return adapter;

    const isPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
    if (isPostgres) {
        adapter = new PostgresAdapter();
    } else {
        adapter = new SQLiteAdapter();
    }
    return adapter;
}

export async function ensureInit() {
    if (!initPromise) {
        const activeAdapter = getAdapter();
        initPromise = activeAdapter.init().then(async () => {
            // Shared defaults initialization logic
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
                { key: 'llm_model', val: 'gemini-2.5-flash' }
            ];

            for (const item of defaults) {
                const existing = await activeAdapter.getSetting(item.key);
                if (!existing) await activeAdapter.saveSetting(item.key, item.val);
            }
        });
    }
    await initPromise;
}
