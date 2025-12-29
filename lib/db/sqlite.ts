import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../logger';
import { IDatabaseAdapter } from './interface';
import {
    Recipe, Entry, Dish, RecognitionTask
} from './types';

export class SQLiteAdapter implements IDatabaseAdapter {
    private db: any;

    constructor() {
        const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'nutrition.db');
        if (process.env.DB_PATH) {
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        this.db = new Database(dbPath, { verbose: (msg) => logger.debug(msg) });
        this.db.pragma('journal_mode = WAL');
        logger.info("SQLite initialized at " + dbPath);
    }

    async init(): Promise<void> {
        this.db.exec(`
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
                status TEXT NOT NULL,
                result TEXT,
                error TEXT,
                image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration
        const tables = ['recipes', 'dishes'];
        for (const table of tables) {
            const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as any[];
            if (!columns.some(c => c.name === 'energy_unit')) {
                this.db.exec(`ALTER TABLE ${table} ADD COLUMN energy_unit TEXT DEFAULT 'kcal'`);
            }
            if (!columns.some(c => c.name === 'weight_unit')) {
                this.db.exec(`ALTER TABLE ${table} ADD COLUMN weight_unit TEXT DEFAULT 'g'`);
            }
        }
    }

    async getSetting(key: string): Promise<string | undefined> {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row?.value;
    }

    async saveSetting(key: string, value: string): Promise<void> {
        this.db.prepare(`
            INSERT INTO settings (key, value) VALUES (@key, @value)
            ON CONFLICT(key) DO UPDATE SET value = @value
        `).run({ key, value });
    }

    async getRecipe(name: string): Promise<Recipe | undefined> {
        return this.db.prepare('SELECT * FROM recipes WHERE name = ?').get(name) as Recipe | undefined;
    }

    async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
        const info = this.db.prepare(`
            INSERT INTO recipes (name, energy, energy_unit, protein, carbs, fat, weight_unit)
            VALUES (@name, @energy, @energy_unit, @protein, @carbs, @fat, @weight_unit)
        `).run(recipe);
        return { ...recipe, id: Number(info.lastInsertRowid) } as Recipe;
    }

    async getEntries(date: string): Promise<Entry[]> {
        return this.db.prepare('SELECT * FROM entries WHERE date = ? ORDER BY time ASC').all(date) as Entry[];
    }

    async createEntry(date: string, time: string, type?: string): Promise<Entry> {
        const info = this.db.prepare(`
            INSERT INTO entries (date, time, type)
            VALUES (@date, @time, @type)
        `).run({ date, time, type });
        return { id: Number(info.lastInsertRowid), date, time, type };
    }

    async getEntryByDateTime(date: string, time: string): Promise<Entry | undefined> {
        return this.db.prepare('SELECT * FROM entries WHERE date = ? AND time = ?').get(date, time) as Entry | undefined;
    }

    async addDish(entryId: number, recipe: Recipe, amount: number): Promise<Dish> {
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
        const info = this.db.prepare(`
            INSERT INTO dishes (entry_id, recipe_id, amount, name, energy, energy_unit, protein, carbs, fat, weight_unit)
            VALUES (@entry_id, @recipe_id, @amount, @name, @energy, @energy_unit, @protein, @carbs, @fat, @weight_unit)
        `).run(dishData);
        return { id: Number(info.lastInsertRowid), ...dishData };
    }

    async getDishesForEntry(entryId: number): Promise<Dish[]> {
        return this.db.prepare(`
            SELECT *,
                   ((CASE WHEN energy_unit = 'kj' THEN energy / 4.184 ELSE energy END) * 
                    (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_energy,
                   (protein * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_protein,
                   (carbs * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_carbs,
                   (fat * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_fat
            FROM dishes
            WHERE entry_id = ?
        `).all(entryId) as Dish[];
    }

    async getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]> {
        return this.db.prepare(`
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
        `).all(startDate, endDate) as { date: string; calories: number }[];
    }

    async createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask> {
        this.db.prepare(`
            INSERT INTO recognition_tasks (id, status, image_path)
            VALUES (?, 'pending', ?)
        `).run(id, imagePath);
        return (await this.getRecognitionTask(id))!;
    }

    async updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>): Promise<void> {
        const keys = Object.keys(updates);
        const sets = keys.map(k => `${k} = @${k}`).join(', ');
        this.db.prepare(`
            UPDATE recognition_tasks 
            SET ${sets}, updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `).run({ ...updates, id });
    }

    async getRecognitionTask(id: string): Promise<RecognitionTask | undefined> {
        return this.db.prepare('SELECT * FROM recognition_tasks WHERE id = ?').get(id) as RecognitionTask | undefined;
    }
}
