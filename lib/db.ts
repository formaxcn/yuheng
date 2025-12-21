import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'nutrition.db');
// Ensure directory exists if custom path provided
if (process.env.DB_PATH) {
    const dir = path.dirname(dbPath);
    logger.info(`Checking if directory exists: ${dir}`);
    if (!fs.existsSync(dir)) {
        logger.info(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    } else {
        logger.info(`Directory already exists: ${dir}`);
        // Check if we have write permissions
        try {
            fs.accessSync(dir, fs.constants.W_OK);
            logger.info(`Have write permissions for: ${dir}`);
        } catch (e) {
            logger.error(`No write permissions for: ${dir}`);
            throw e;
        }
    }
}

const db = new Database(dbPath, { verbose: (msg) => logger.debug(msg) });

const DEFAULT_MEAL_CONFIG = {
    Breakfast: { start: 6, end: 10, default: "08:00" },
    Lunch: { start: 10, end: 14, default: "12:00" },
    Dinner: { start: 17, end: 19, default: "18:00" },
    other: { name: "Snack" } // Fallback for any other time
};

export interface DailyTargets {
    energy: number;
    protein: number;
    carbs: number;
    fat: number;
}

const DEFAULT_DAILY_TARGETS: DailyTargets = {
    energy: 2000,
    protein: 150,
    carbs: 200,
    fat: 65
};

export function initDB() {
    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    const schema = `
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            energy REAL,
            energy_unit TEXT DEFAULT 'kcal',
            protein REAL,
            carbs REAL,
            fat REAL,
            weight_unit TEXT DEFAULT 'g',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            name TEXT,
            amount REAL,
            energy REAL,
            energy_unit TEXT DEFAULT 'kcal',
            protein REAL,
            carbs REAL,
            fat REAL,
            weight_unit TEXT DEFAULT 'g',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS recognition_tasks (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
            result TEXT, -- JSON string of dishes
            error TEXT,
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    db.exec(schema);

    // Initialize default meal times if not exists
    const existingMealConfig = getSetting('meal_times');
    if (!existingMealConfig) {
        saveSetting('meal_times', JSON.stringify(DEFAULT_MEAL_CONFIG));
    }

    // Initialize default targets if not exists
    const existingTargets = getSetting('daily_targets');
    if (!existingTargets) {
        saveSetting('daily_targets', JSON.stringify(DEFAULT_DAILY_TARGETS));
    }

    // Initialize default unit preferences if not exists
    const existingUnitPrefs = getSetting('unit_preferences');
    if (!existingUnitPrefs) {
        saveSetting('unit_preferences', JSON.stringify({ energy: 'kcal', weight: 'g' }));
    }

    // Initialize default recognition language if not exists
    const existingLang = getSetting('recognition_language');
    if (!existingLang) {
        saveSetting('recognition_language', 'zh');
    }

    // Initialize default region if not exists
    const existingRegion = getSetting('region');
    if (!existingRegion) {
        saveSetting('region', 'CN');
    }

    // Migration for existing tables
    const tables = ['recipes', 'dishes'];
    for (const table of tables) {
        const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
        if (!columns.some(c => c.name === 'energy_unit')) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN energy_unit TEXT DEFAULT 'kcal'`);
        }
        if (!columns.some(c => c.name === 'weight_unit')) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN weight_unit TEXT DEFAULT 'g'`);
        }
    }

    logger.info('Database initialized at ' + dbPath);
}

// Initialize on load
initDB();

export const dbInstance = db;

// Types
export interface Recipe {
    id: number;
    name: string;
    energy: number;
    energy_unit: 'kcal' | 'kj';
    protein: number;
    carbs: number;
    fat: number;
    weight_unit: 'g' | 'oz';
    created_at?: string;
}

export interface Entry {
    id: number;
    date: string;
    time: string;
    type?: string;
    created_at?: string;
    dishes?: Dish[]; // Populated manually
}

export interface Dish {
    id: number;
    entry_id: number;
    recipe_id: number;
    amount: number;
    name: string;
    energy: number;
    energy_unit: 'kcal' | 'kj';
    protein: number;
    carbs: number;
    fat: number;
    weight_unit: 'g' | 'oz';
    created_at?: string;
    // Calculated values for convenience
    total_energy?: number;
    total_protein?: number;
    total_carbs?: number;
    total_fat?: number;
}

// Repositories

// --- Settings ---
export function getSetting(key: string): string | undefined {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value;
}

export function saveSetting(key: string, value: string) {
    const stmt = db.prepare(`
        INSERT INTO settings (key, value) VALUES (@key, @value)
        ON CONFLICT(key) DO UPDATE SET value = @value
    `);
    stmt.run({ key, value });
}

export function getMealConfig() {
    const configStr = getSetting('meal_times');
    try {
        return configStr ? JSON.parse(configStr) : DEFAULT_MEAL_CONFIG;
    } catch (e) {
        logger.error(e as Error, "Failed to parse meal config");
        return DEFAULT_MEAL_CONFIG;
    }
}

export function getDailyTargets(): DailyTargets {
    const targetStr = getSetting('daily_targets');
    try {
        return targetStr ? JSON.parse(targetStr) : DEFAULT_DAILY_TARGETS;
    } catch (e) {
        logger.error(e as Error, "Failed to parse daily targets");
        return DEFAULT_DAILY_TARGETS;
    }
}

export function saveDailyTargets(targets: DailyTargets) {
    saveSetting('daily_targets', JSON.stringify(targets));
}

export interface UnitPreferences {
    energy: 'kcal' | 'kj';
    weight: 'g' | 'oz';
}

const DEFAULT_UNIT_PREFS: UnitPreferences = {
    energy: 'kcal',
    weight: 'g'
};

export function getUnitPreferences(): UnitPreferences {
    const prefStr = getSetting('unit_preferences');
    try {
        return prefStr ? JSON.parse(prefStr) : DEFAULT_UNIT_PREFS;
    } catch (e) {
        logger.error(e as Error, "Failed to parse unit preferences");
        return DEFAULT_UNIT_PREFS;
    }
}

export function saveUnitPreferences(prefs: UnitPreferences) {
    saveSetting('unit_preferences', JSON.stringify(prefs));
}

export function getRecognitionLanguage(): 'zh' | 'en' {
    const lang = getSetting('recognition_language');
    return (lang === 'en' ? 'en' : 'zh');
}

export function saveRecognitionLanguage(lang: 'zh' | 'en') {
    saveSetting('recognition_language', lang);
}

// --- Recipes ---
export function getRecipe(name: string): Recipe | undefined {
    const stmt = db.prepare('SELECT * FROM recipes WHERE name = ?');
    return stmt.get(name) as Recipe | undefined;
}

export function createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Recipe {
    const stmt = db.prepare(`
        INSERT INTO recipes (name, energy, energy_unit, protein, carbs, fat, weight_unit)
        VALUES (@name, @energy, @energy_unit, @protein, @carbs, @fat, @weight_unit)
    `);
    const info = stmt.run(recipe);
    return { ...recipe, id: Number(info.lastInsertRowid) };
}

// --- Entries ---
export function getEntries(date: string): Entry[] {
    const stmt = db.prepare('SELECT * FROM entries WHERE date = ? ORDER BY time ASC');
    return stmt.all(date) as Entry[];
}

export function createEntry(date: string, time: string, type?: string): Entry {
    const stmt = db.prepare(`
        INSERT INTO entries (date, time, type)
        VALUES (@date, @time, @type)
    `);
    const info = stmt.run({ date, time, type });
    return { id: Number(info.lastInsertRowid), date, time, type };
}

export function getEntryByDateTime(date: string, time: string): Entry | undefined {
    const stmt = db.prepare('SELECT * FROM entries WHERE date = ? AND time = ?');
    return stmt.get(date, time) as Entry | undefined;
}

// --- Dishes ---
export function addDish(entryId: number, recipe: Recipe, amount: number): Dish {
    const stmt = db.prepare(`
        INSERT INTO dishes (entry_id, recipe_id, amount, name, energy, energy_unit, protein, carbs, fat, weight_unit)
        VALUES (@entry_id, @recipe_id, @amount, @name, @energy, @energy_unit, @protein, @carbs, @fat, @weight_unit)
    `);

    // Snapshot the recipe data
    const dishData = {
        entry_id: entryId,
        recipe_id: recipe.id,
        amount,
        name: recipe.name,
        energy: recipe.energy,
        energy_unit: recipe.energy_unit,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        weight_unit: recipe.weight_unit
    };

    const info = stmt.run(dishData);
    return { id: Number(info.lastInsertRowid), ...dishData };
}

export function getDishesForEntry(entryId: number): Dish[] {
    const stmt = db.prepare(`
        SELECT *,
               ((CASE WHEN energy_unit = 'kj' THEN energy / 4.184 ELSE energy END) * 
                (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_energy,
               (protein * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_protein,
               (carbs * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_carbs,
               (fat * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_fat
        FROM dishes
        WHERE entry_id = ?
    `);
    return stmt.all(entryId) as Dish[];
}

// --- History ---
export function getHistory(startDate: string, endDate: string): { date: string; calories: number; }[] {
    const stmt = db.prepare(`
        SELECT 
            e.date, 
            SUM(
                (CASE WHEN d.energy_unit = 'kj' THEN d.energy / 4.184 ELSE d.energy END) * 
                (CASE WHEN d.weight_unit = 'oz' THEN d.amount * 28.3495 ELSE d.amount END) / 100
            ) as calories
        FROM entries e
        JOIN dishes d ON e.id = d.entry_id
        WHERE e.date >= ? AND e.date <= ?
        GROUP BY e.date
        ORDER BY e.date ASC
    `);

    // Perform query
    const result = stmt.all(startDate, endDate) as { date: string; calories: number }[];

    // Fill in missing dates with 0
    const history: { date: string; calories: number }[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const found = result.find(r => r.date === dateStr);
        history.push({ date: dateStr, calories: found ? (found.calories || 0) : 0 });
        current.setDate(current.getDate() + 1);
    }

    return history;
}

// --- Recognition Tasks ---
export interface RecognitionTask {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: string;
    error?: string;
    image_path?: string;
    created_at: string;
    updated_at: string;
}

export function createRecognitionTask(id: string, imagePath?: string): RecognitionTask {
    const stmt = db.prepare(`
        INSERT INTO recognition_tasks (id, status, image_path)
        VALUES (?, 'pending', ?)
    `);
    stmt.run(id, imagePath);
    return getRecognitionTask(id)!;
}

export function updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>) {
    const sets = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`
        UPDATE recognition_tasks 
        SET ${sets}, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `);
    stmt.run({ ...updates, id });
}

export function getRecognitionTask(id: string): RecognitionTask | undefined {
    const stmt = db.prepare('SELECT * FROM recognition_tasks WHERE id = ?');
    return stmt.get(id) as RecognitionTask | undefined;
}

