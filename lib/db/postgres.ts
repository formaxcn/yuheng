import postgres from 'postgres';
import { logger } from '../logger';
import { IDatabaseAdapter } from './interface';
import {
    Recipe, Entry, Dish, RecognitionTask
} from './types';

export class PostgresAdapter implements IDatabaseAdapter {
    private sql: any;

    constructor() {
        const url = process.env.DATABASE_URL!;
        this.sql = postgres(url);
        logger.info("PostgreSQL initialized");
    }

    async init(): Promise<void> {
        try {
            await this.sql`SELECT 1`;
            logger.info("PostgreSQL connection verified");
        } catch (error) {
            logger.error(error, "PostgreSQL initialization failed");
            throw error;
        }
    }

    async getSetting(key: string): Promise<string | undefined> {
        const rows = await this.sql`SELECT value FROM settings WHERE key = ${key}`;
        return rows[0]?.value;
    }

    async saveSetting(key: string, value: string): Promise<void> {
        await this.sql`
            INSERT INTO settings (key, value) VALUES (${key}, ${value})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
    }

    async getRecipe(name: string): Promise<Recipe | undefined> {
        const rows = await this.sql`SELECT * FROM recipes WHERE name = ${name}`;
        return rows[0];
    }

    async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
        const rows = await this.sql`
            INSERT INTO recipes (name, energy, energy_unit, protein, carbs, fat, weight_unit)
            VALUES (${recipe.name}, ${recipe.energy}, ${recipe.energy_unit}, ${recipe.protein}, ${recipe.carbs}, ${recipe.fat}, ${recipe.weight_unit})
            RETURNING id
        `;
        return { ...recipe, id: rows[0].id } as Recipe;
    }

    async getEntries(date: string): Promise<Entry[]> {
        return await this.sql`SELECT * FROM entries WHERE date = ${date} ORDER BY time ASC`;
    }

    async createEntry(date: string, time: string, type?: string): Promise<Entry> {
        const rows = await this.sql`
            INSERT INTO entries (date, time, type)
            VALUES (${date}, ${time}, ${type || null})
            RETURNING id
        `;
        return { id: rows[0].id, date, time, type };
    }

    async getEntryByDateTime(date: string, time: string): Promise<Entry | undefined> {
        const rows = await this.sql`SELECT * FROM entries WHERE date = ${date} AND time = ${time}`;
        return rows[0];
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
        const rows = await this.sql`
            INSERT INTO dishes (entry_id, recipe_id, amount, name, energy, energy_unit, protein, carbs, fat, weight_unit)
            VALUES (${dishData.entry_id}, ${dishData.recipe_id}, ${dishData.amount}, ${dishData.name}, ${dishData.energy}, ${dishData.energy_unit}, ${dishData.protein}, ${dishData.carbs}, ${dishData.fat}, ${dishData.weight_unit})
            RETURNING id
        `;
        return { id: rows[0].id, ...dishData };
    }

    async getDishesForEntry(entryId: number): Promise<Dish[]> {
        return await this.sql`
            SELECT *,
                   ((CASE WHEN energy_unit = 'kj' THEN energy / 4.184 ELSE energy END) * 
                    (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_energy,
                   (protein * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_protein,
                   (carbs * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_carbs,
                   (fat * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_fat
            FROM dishes
            WHERE entry_id = ${entryId}
        `;
    }

    async getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]> {
        return await this.sql`
            SELECT 
                e.date, 
                SUM(
                    (CASE WHEN d.energy_unit = 'kj' THEN d.energy / 4.184 ELSE d.energy END) * 
                    (CASE WHEN d.weight_unit = 'oz' THEN d.amount * 28.3495 ELSE d.amount END) / 100
                ) as calories
            FROM entries e
            JOIN dishes d ON e.id = d.entry_id
            WHERE e.date >= ${startDate} AND e.date <= ${endDate}
            GROUP BY e.date
            ORDER BY e.date ASC
        `;
    }

    async createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask> {
        await this.sql`
            INSERT INTO recognition_tasks (id, status, image_path)
            VALUES (${id}, 'pending', ${imagePath || null})
        `;
        return (await this.getRecognitionTask(id))!;
    }

    async updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>): Promise<void> {
        const allowedKeys = ['status', 'result', 'error'] as const;
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => allowedKeys.includes(key as any))
        );

        if (Object.keys(validUpdates).length === 0) return;

        await this.sql`
            UPDATE recognition_tasks 
            SET ${this.sql(validUpdates)}, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
        `;
    }

    async getRecognitionTask(id: string): Promise<RecognitionTask | undefined> {
        const rows = await this.sql`SELECT * FROM recognition_tasks WHERE id = ${id}`;
        return rows[0];
    }
}
