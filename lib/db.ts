import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'nutrition.db');
// Ensure directory exists if custom path provided
if (process.env.DB_PATH) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
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
            protein REAL,
            carbs REAL,
            fat REAL,
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
            protein REAL,
            carbs REAL,
            fat REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
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
    protein: number;
    carbs: number;
    fat: number;
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
    protein: number;
    carbs: number;
    fat: number;
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

// --- Recipes ---
export function getRecipe(name: string): Recipe | undefined {
    const stmt = db.prepare('SELECT * FROM recipes WHERE name = ?');
    return stmt.get(name) as Recipe | undefined;
}

export function createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Recipe {
    const stmt = db.prepare(`
        INSERT INTO recipes (name, energy, protein, carbs, fat)
        VALUES (@name, @energy, @protein, @carbs, @fat)
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
        INSERT INTO dishes (entry_id, recipe_id, amount, name, energy, protein, carbs, fat)
        VALUES (@entry_id, @recipe_id, @amount, @name, @energy, @protein, @carbs, @fat)
    `);

    // Snapshot the recipe data
    const dishData = {
        entry_id: entryId,
        recipe_id: recipe.id,
        amount,
        name: recipe.name,
        energy: recipe.energy,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat
    };

    const info = stmt.run(dishData);
    return { id: Number(info.lastInsertRowid), ...dishData };
}

export function getDishesForEntry(entryId: number): Dish[] {
    const stmt = db.prepare(`
        SELECT *,
               (energy * amount / 100) as total_energy,
               (protein * amount / 100) as total_protein,
               (carbs * amount / 100) as total_carbs,
               (fat * amount / 100) as total_fat
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
            SUM(d.amount * d.energy / 100) as calories
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

