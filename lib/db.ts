import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';

const dbPath = path.join(process.cwd(), 'nutrition.db');
const db = new Database(dbPath, { verbose: (msg) => logger.debug(msg) });

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

        CREATE TABLE IF NOT EXISTS targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE,
            energy_target REAL,
            protein_target REAL,
            carbs_target REAL,
            fat_target REAL
        );
    `;

    db.exec(schema);
    logger.info('Database initialized');
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

export interface Target {
    id: number;
    date: string | null;
    energy_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
}

// Repositories

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

// --- Targets ---
export function getTarget(date?: string): Target | undefined {
    if (date) {
        const stmt = db.prepare('SELECT * FROM targets WHERE date = ?');
        const target = stmt.get(date) as Target | undefined;
        if (target) return target;
    }
    // Fallback to default (NULL date)
    const stmtDefault = db.prepare('SELECT * FROM targets WHERE date IS NULL');
    return stmtDefault.get() as Target | undefined;
}

export function saveTarget(target: Omit<Target, 'id'>): Target {
    const existing = getTarget(target.date || undefined);

    if (existing && existing.date === target.date) {
        const stmt = db.prepare(`
            UPDATE targets 
            SET energy_target = @energy_target, 
                protein_target = @protein_target, 
                carbs_target = @carbs_target, 
                fat_target = @fat_target
            WHERE id = @id
        `);
        stmt.run({ ...target, id: existing.id });
        return { ...target, id: existing.id };
    } else {
        const stmt = db.prepare(`
            INSERT INTO targets (date, energy_target, protein_target, carbs_target, fat_target)
            VALUES (@date, @energy_target, @protein_target, @carbs_target, @fat_target)
        `);
        const info = stmt.run(target);
        return { ...target, id: Number(info.lastInsertRowid) };
    }
}
