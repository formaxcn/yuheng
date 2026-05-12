import { getAdapter, ensureInit } from './db/index';
export { getAdapter, ensureInit };
import {
    DEFAULT_MEAL_CONFIG,
    DEFAULT_DAILY_TARGETS,
    DEFAULT_UNIT_PREFERENCES
} from './constants';
import {
    Recipe, Entry, Dish, RecognitionTask, DailyTargets, UnitPreferences, User
} from './db/types';
import { RecognizedDish } from './recognition/types';

export type { Recipe, Entry, Dish, RecognitionTask, DailyTargets, UnitPreferences, RecognizedDish, User };

// --- Settings ---
export async function getSetting(key: string, userId?: string): Promise<string | undefined> {
    await ensureInit();
    return getAdapter().getSetting(key, userId);
}

export async function saveSetting(key: string, value: string, userId?: string): Promise<void> {
    await ensureInit();
    return getAdapter().saveSetting(key, value, userId);
}

export async function isMultiUserEnabled(): Promise<boolean> {
    await ensureInit();
    return getAdapter().isMultiUserEnabled();
}

// Helper Wrappers
export async function getMealConfig() {
    const configStr = await getSetting('meal_times');
    try {
        return configStr ? JSON.parse(configStr) : DEFAULT_MEAL_CONFIG;
    } catch (e) {
        return [];
    }
}

export async function getDailyTargets(): Promise<DailyTargets> {
    const targetStr = await getSetting('daily_targets');
    try {
        return targetStr ? JSON.parse(targetStr) : DEFAULT_DAILY_TARGETS;
    } catch (e) {
        return DEFAULT_DAILY_TARGETS;
    }
}

export async function saveDailyTargets(targets: DailyTargets) {
    await saveSetting('daily_targets', JSON.stringify(targets));
}

export async function getUnitPreferences(): Promise<UnitPreferences> {
    const prefStr = await getSetting('unit_preferences');
    try {
        return prefStr ? JSON.parse(prefStr) : DEFAULT_UNIT_PREFERENCES;
    } catch (e) {
        return DEFAULT_UNIT_PREFERENCES;
    }
}

export async function saveUnitPreferences(prefs: UnitPreferences) {
    await saveSetting('unit_preferences', JSON.stringify(prefs));
}

// --- Recipes ---
export async function getRecipe(name: string): Promise<Recipe | undefined> {
    await ensureInit();
    return getAdapter().getRecipe(name);
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
    await ensureInit();
    return getAdapter().createRecipe(recipe);
}

// --- Entries ---
export async function getEntries(date: string): Promise<Entry[]> {
    await ensureInit();
    return getAdapter().getEntries(date);
}

export async function createEntry(date: string, time: string, type?: string): Promise<Entry> {
    await ensureInit();
    return getAdapter().createEntry(date, time, type);
}

export async function getEntryByDateTime(date: string, time: string): Promise<Entry | undefined> {
    await ensureInit();
    return getAdapter().getEntryByDateTime(date, time);
}

// --- Dishes ---
export async function addDish(entryId: number, recipe: Recipe, amount: number): Promise<Dish> {
    await ensureInit();
    return getAdapter().addDish(entryId, recipe, amount);
}

export async function getDishesForEntry(entryId: number): Promise<Dish[]> {
    await ensureInit();
    return getAdapter().getDishesForEntry(entryId);
}

// --- History ---
export async function getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]> {
    await ensureInit();
    const result = await getAdapter().getHistory(startDate, endDate);

    // Fill in missing dates with 0
    const history: { date: string; calories: number }[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const found = result.find(r => r.date === dateStr);
        history.push({ date: dateStr, calories: found ? (Number(found.calories) || 0) : 0 });
        current.setDate(current.getDate() + 1);
    }

    return history;
}

// --- Recognition Tasks ---
export async function createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask> {
    await ensureInit();
    return getAdapter().createRecognitionTask(id, imagePath);
}

export async function updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>) {
    await ensureInit();
    return getAdapter().updateRecognitionTask(id, updates);
}

export async function getRecognitionTask(id: string): Promise<RecognitionTask | undefined> {
    await ensureInit();
    return getAdapter().getRecognitionTask(id);
}

// --- Users (Multi-User Mode) ---
export async function getUser(id: string): Promise<User | undefined> {
    await ensureInit();
    return getAdapter().getUser(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
    await ensureInit();
    return getAdapter().getUserByEmail(email);
}

export async function listUsers(): Promise<User[]> {
    await ensureInit();
    return getAdapter().listUsers();
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    await ensureInit();
    return getAdapter().createUser(user);
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<void> {
    await ensureInit();
    return getAdapter().updateUser(id, updates);
}

export async function deleteUser(id: string): Promise<void> {
    await ensureInit();
    return getAdapter().deleteUser(id);
}

export async function updateLastLogin(id: string): Promise<void> {
    await ensureInit();
    return getAdapter().updateLastLogin(id);
}

