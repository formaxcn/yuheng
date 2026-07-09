import Database from 'better-sqlite3';
import { logger } from '../logger';
import { IDatabaseAdapter } from './interface';
import {
    Recipe, Entry, Dish, RecognitionTask, User,
    DeviceRequest, SessionRecord
} from './types';
import { UserContext, DEFAULT_USER_ID } from './user-context';

export class SqliteAdapter implements IDatabaseAdapter {
    private db: Database.Database;

    constructor() {
        const url = process.env.DATABASE_URL!;
        const dbPath = url.replace('file:', '');

        // Ensure directory exists
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.pragma('foreign_keys = ON');
        logger.info('SQLite initialized at: ' + dbPath);
    }

    async init(): Promise<void> {
        try {
            this.db.prepare('SELECT 1').get();
            logger.info('SQLite connection verified');
        } catch (error) {
            logger.error(error, 'SQLite initialization failed');
            throw error;
        }
    }

    private generateUUID(): string {
        // Simple UUID v4 generator
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    // ========================================================================
    // Settings (user-scoped with fallback to global/default user)
    // ========================================================================

    async getSetting(key: string, userId?: string): Promise<string | undefined> {
        const targetUserId = userId ?? UserContext.get();

        // First try user-specific setting
        const stmt = this.db.prepare(`
            SELECT value FROM settings
            WHERE key = ?
            AND user_id = ?
        `);
        const rows = stmt.all(key, targetUserId) as any[];
        if (rows.length > 0) return rows[0].value;

        // Fallback to default user (global settings)
        if (targetUserId !== DEFAULT_USER_ID) {
            const fallbackStmt = this.db.prepare(`
                SELECT value FROM settings
                WHERE key = ?
                AND user_id = ?
            `);
            const fallback = fallbackStmt.all(key, DEFAULT_USER_ID) as any[];
            return fallback[0]?.value;
        }

        return undefined;
    }

    async saveSetting(key: string, value: string, userId?: string): Promise<void> {
        const targetUserId = userId ?? UserContext.get();
        const stmt = this.db.prepare(`
            INSERT INTO settings (user_id, key, value)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
        `);
        stmt.run(targetUserId, key, value);
    }

    async isMultiUserEnabled(): Promise<boolean> {
        const value = await this.getSetting('multi_user_enabled', DEFAULT_USER_ID);
        return value === 'true';
    }

    // ========================================================================
    // Users
    // ========================================================================

    async getUser(id: string): Promise<User | undefined> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
        const rows = stmt.all(id) as any[];
        return rows[0] as User | undefined;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
        const rows = stmt.all(email) as any[];
        return rows[0] as User | undefined;
    }

    async listUsers(): Promise<User[]> {
        const stmt = this.db.prepare(`
            SELECT id, name, email, avatar, is_active, is_default, role, created_at, last_login_at
            FROM users
            WHERE is_active = 1
            ORDER BY name ASC
        `);
        return stmt.all() as User[];
    }

    async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
        const id = this.generateUUID();
        const createdAt = this.getCurrentTimestamp();
        const stmt = this.db.prepare(`
            INSERT INTO users (
                id, name, email, password_hash, avatar, is_active, is_default, role, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            id,
            user.name,
            user.email || null,
            user.password_hash || null,
            user.avatar || null,
            user.is_active ? 1 : 0,
            user.is_default ? 1 : 0,
            user.role || 'user',
            createdAt
        );
        return { ...user, id, created_at: createdAt } as User;
    }

    async createDefaultUser(): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO users (id, name, is_default, created_at)
            VALUES (?, ?, 1, ?)
        `);
        stmt.run(DEFAULT_USER_ID, 'Default', this.getCurrentTimestamp());
        logger.info('Default user created');
    }

    async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(updates.password_hash); }
        if (updates.avatar !== undefined) { fields.push('avatar = ?'); values.push(updates.avatar); }
        if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }
        if (updates.is_default !== undefined) { fields.push('is_default = ?'); values.push(updates.is_default ? 1 : 0); }
        if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
        if (updates.last_login_at !== undefined) { fields.push('last_login_at = ?'); values.push(updates.last_login_at); }

        if (fields.length === 0) return;

        values.push(id);
        const stmt = this.db.prepare(`
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = ?
        `);
        stmt.run(...values);
    }

    async deleteUser(id: string): Promise<void> {
        const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);
    }

    async updateLastLogin(id: string): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE users
            SET last_login_at = ?
            WHERE id = ?
        `);
        stmt.run(this.getCurrentTimestamp(), id);
    }

    // ========================================================================
    // Recipes
    // ========================================================================

    async getRecipe(name: string): Promise<Recipe | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM recipes
            WHERE name = ?
            AND user_id = ?
        `);
        const rows = stmt.all(name, UserContext.get()) as any[];
        return rows[0] as Recipe | undefined;
    }

    async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
        const createdAt = this.getCurrentTimestamp();
        const stmt = this.db.prepare(`
            INSERT INTO recipes (
                name, energy, energy_unit, protein, carbs, fat, weight_unit, user_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            recipe.name,
            recipe.energy || null,
            recipe.energy_unit || 'kcal',
            recipe.protein || null,
            recipe.carbs || null,
            recipe.fat || null,
            recipe.weight_unit || 'g',
            UserContext.get(),
            createdAt
        );
        return { ...recipe, id: Number(result.lastInsertRowid), created_at: createdAt } as Recipe;
    }

    // ========================================================================
    // Entries
    // ========================================================================

    async getEntries(date: string): Promise<Entry[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM entries
            WHERE date = ?
            AND user_id = ?
            ORDER BY time ASC
        `);
        return stmt.all(date, UserContext.get()) as Entry[];
    }

    async createEntry(date: string, time: string, type?: string): Promise<Entry> {
        const createdAt = this.getCurrentTimestamp();
        const stmt = this.db.prepare(`
            INSERT INTO entries (date, time, type, user_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(date, time, type || null, UserContext.get(), createdAt);
        return { id: Number(result.lastInsertRowid), date, time, type, created_at: createdAt } as Entry;
    }

    async getEntryByDateTime(date: string, time: string): Promise<Entry | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM entries
            WHERE date = ?
            AND time = ?
            AND user_id = ?
        `);
        const rows = stmt.all(date, time, UserContext.get()) as any[];
        return rows[0] as Entry | undefined;
    }

    // ========================================================================
    // Dishes
    // ========================================================================

    async addDish(entryId: number, recipe: Recipe, amount: number): Promise<Dish> {
        const createdAt = this.getCurrentTimestamp();
        const dishData = {
            user_id: UserContext.get(),
            entry_id: entryId,
            recipe_id: recipe.id,
            amount,
            name: recipe.name,
            energy: recipe.energy,
            energy_unit: recipe.energy_unit || 'kcal',
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            weight_unit: recipe.weight_unit || 'g'
        };
        const stmt = this.db.prepare(`
            INSERT INTO dishes (
                user_id, entry_id, recipe_id, amount, name, energy, energy_unit,
                protein, carbs, fat, weight_unit, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            dishData.user_id,
            dishData.entry_id,
            dishData.recipe_id,
            dishData.amount,
            dishData.name,
            dishData.energy || null,
            dishData.energy_unit,
            dishData.protein || null,
            dishData.carbs || null,
            dishData.fat || null,
            dishData.weight_unit,
            createdAt
        );
        return { id: Number(result.lastInsertRowid), ...dishData, created_at: createdAt } as Dish;
    }

    async getDishesForEntry(entryId: number): Promise<Dish[]> {
        const stmt = this.db.prepare(`
            SELECT *,
                   ((CASE WHEN energy_unit = 'kj' THEN energy / 4.184 ELSE energy END) *
                    (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_energy,
                   (protein * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_protein,
                   (carbs * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_carbs,
                   (fat * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_fat
            FROM dishes
            WHERE entry_id = ?
            AND user_id = ?
        `);
        return stmt.all(entryId, UserContext.get()) as Dish[];
    }

    // ========================================================================
    // History
    // ========================================================================

    async getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]> {
        const stmt = this.db.prepare(`
            SELECT
                e.date,
                SUM(
                    (CASE WHEN d.energy_unit = 'kj' THEN d.energy / 4.184 ELSE d.energy END) *
                    (CASE WHEN d.weight_unit = 'oz' THEN d.amount * 28.3495 ELSE d.amount END) / 100
                ) as calories
            FROM entries e
            JOIN dishes d ON e.id = d.entry_id
            WHERE e.date >= ? AND e.date <= ?
            AND e.user_id = ?
            GROUP BY e.date
            ORDER BY e.date ASC
        `);
        return stmt.all(startDate, endDate, UserContext.get()) as { date: string; calories: number }[];
    }

    // ========================================================================
    // Recognition Tasks
    // ========================================================================

    async createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask> {
        const createdAt = this.getCurrentTimestamp();
        const stmt = this.db.prepare(`
            INSERT INTO recognition_tasks (id, status, image_path, user_id, created_at, updated_at)
            VALUES (?, 'pending', ?, ?, ?, ?)
        `);
        stmt.run(id, imagePath || null, UserContext.get(), createdAt, createdAt);
        return (await this.getRecognitionTask(id))!;
    }

    async updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>): Promise<void> {
        const allowedKeys: readonly ('status' | 'result' | 'error')[] = ['status', 'result', 'error'] as const;
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => allowedKeys.includes(key as typeof allowedKeys[number]))
        );

        if (Object.keys(validUpdates).length === 0) return;

        const fields = Object.keys(validUpdates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(validUpdates);
        values.push(this.getCurrentTimestamp());
        values.push(id);
        values.push(UserContext.get());

        const stmt = this.db.prepare(`
            UPDATE recognition_tasks
            SET ${fields}, updated_at = ?
            WHERE id = ?
            AND user_id = ?
        `);
        stmt.run(...values);
    }

    async getRecognitionTask(id: string): Promise<RecognitionTask | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM recognition_tasks
            WHERE id = ?
            AND user_id = ?
        `);
        const rows = stmt.all(id, UserContext.get()) as any[];
        return rows[0] as RecognitionTask | undefined;
    }

    // ========================================================================
    // Device Auth - Sessions
    // ========================================================================

    async createSession(userId: string, fingerprint: string, deviceName: string | null, expiresAt: Date): Promise<SessionRecord> {
        const createdAt = this.getCurrentTimestamp();
        const expiresAtStr = expiresAt.toISOString();
        const stmt = this.db.prepare(`
            INSERT INTO sessions (user_id, fingerprint, device_name, created_at, last_active_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(userId, fingerprint, deviceName, createdAt, createdAt, expiresAtStr);
        return {
            id: Number(result.lastInsertRowid),
            user_id: userId,
            fingerprint,
            device_name: deviceName,
            created_at: createdAt,
            last_active_at: createdAt,
            expires_at: expiresAtStr
        } as SessionRecord;
    }

    async getSession(id: number): Promise<SessionRecord | undefined> {
        const stmt = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`);
        const rows = stmt.all(id) as any[];
        return rows[0] as SessionRecord | undefined;
    }

    async getSessionByFingerprint(userId: string, fingerprint: string): Promise<SessionRecord | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM sessions
            WHERE user_id = ?
            AND fingerprint = ?
            ORDER BY created_at DESC
            LIMIT 1
        `);
        const rows = stmt.all(userId, fingerprint) as any[];
        return rows[0] as SessionRecord | undefined;
    }

    async updateSessionActivity(id: number): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE sessions SET last_active_at = ? WHERE id = ?
        `);
        stmt.run(this.getCurrentTimestamp(), id);
    }

    async deleteSession(id: number): Promise<void> {
        const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
        stmt.run(id);
    }

    async listSessions(userId: string): Promise<SessionRecord[]> {
        const stmt = this.db.prepare(`
            SELECT * FROM sessions
            WHERE user_id = ?
            ORDER BY last_active_at DESC
        `);
        return stmt.all(userId) as SessionRecord[];
    }

    // ========================================================================
    // Device Auth - Device Requests
    // ========================================================================

    async createDeviceRequest(userId: string, requestCode: string, deviceName: string | null): Promise<DeviceRequest> {
        const createdAt = this.getCurrentTimestamp();
        const stmt = this.db.prepare(`
            INSERT INTO device_requests (user_id, request_code, device_name, status, created_at)
            VALUES (?, ?, ?, 'pending', ?)
        `);
        const result = stmt.run(userId, requestCode, deviceName, createdAt);
        return {
            id: Number(result.lastInsertRowid),
            user_id: userId,
            request_code: requestCode,
            device_name: deviceName,
            status: 'pending',
            created_at: createdAt,
            resolved_at: null
        } as DeviceRequest;
    }

    async getDeviceRequestByCode(requestCode: string): Promise<DeviceRequest | undefined> {
        const stmt = this.db.prepare(`
            SELECT * FROM device_requests
            WHERE request_code = ?
            AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
        `);
        const rows = stmt.all(requestCode) as any[];
        return rows[0] as DeviceRequest | undefined;
    }

    async getDeviceRequest(id: number): Promise<DeviceRequest | undefined> {
        const stmt = this.db.prepare(`SELECT * FROM device_requests WHERE id = ?`);
        const rows = stmt.all(id) as any[];
        return rows[0] as DeviceRequest | undefined;
    }

    async updateDeviceRequestStatus(id: number, status: 'approved' | 'denied' | 'expired'): Promise<void> {
        const stmt = this.db.prepare(`
            UPDATE device_requests
            SET status = ?, resolved_at = ?
            WHERE id = ?
        `);
        stmt.run(status, this.getCurrentTimestamp(), id);
    }

    async listPendingDeviceRequests(userId: string): Promise<DeviceRequest[]> {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const stmt = this.db.prepare(`
            SELECT * FROM device_requests
            WHERE user_id = ?
            AND status = 'pending'
            AND created_at > ?
            ORDER BY created_at DESC
        `);
        return stmt.all(userId, tenMinsAgo) as DeviceRequest[];
    }

    async expireOldDeviceRequests(userId: string, olderThanMinutes: number): Promise<void> {
        const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();
        const stmt = this.db.prepare(`
            UPDATE device_requests
            SET status = 'expired', resolved_at = ?
            WHERE user_id = ?
            AND status = 'pending'
            AND created_at < ?
        `);
        stmt.run(this.getCurrentTimestamp(), userId, cutoff);
    }
}
