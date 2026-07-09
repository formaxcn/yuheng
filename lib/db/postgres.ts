import postgres from 'postgres';
import { logger } from '../logger';
import { IDatabaseAdapter } from './interface';
import {
    Recipe, Entry, Dish, RecognitionTask, User,
    DeviceRequest, SessionRecord
} from './types';
import { UserContext, DEFAULT_USER_ID } from './user-context';

export class PostgresAdapter implements IDatabaseAdapter {
    private sql: postgres.Sql<{}> | null = null;

    private getSql(): postgres.Sql<{}> {
        if (!this.sql) {
            const url = process.env.DATABASE_URL!;
            this.sql = postgres(url);
            logger.info("PostgreSQL initialized");
        }
        return this.sql;
    }

    async init(): Promise<void> {
        try {
            await this.getSql()`SELECT 1`;
            logger.info("PostgreSQL connection verified");
        } catch (error) {
            logger.error(error, "PostgreSQL initialization failed");
            throw error;
        }
    }

    // ========================================================================
    // Settings (user-scoped with fallback to global/default user)
    // ========================================================================

    async getSetting(key: string, userId?: string): Promise<string | undefined> {
        const targetUserId = userId ?? UserContext.get();

        // First try user-specific setting
        const rows = await this.getSql()`
            SELECT value FROM settings
            WHERE key = ${key}
            AND user_id = ${targetUserId}
        `;
        if (rows.length > 0) return rows[0].value;

        // Fallback to default user (global settings)
        if (targetUserId !== DEFAULT_USER_ID) {
            const fallback = await this.getSql()`
                SELECT value FROM settings
                WHERE key = ${key}
                AND user_id = ${DEFAULT_USER_ID}
            `;
            return fallback[0]?.value;
        }

        return undefined;
    }

    async saveSetting(key: string, value: string, userId?: string): Promise<void> {
        const targetUserId = userId ?? UserContext.get();
        await this.getSql()`
            INSERT INTO settings (user_id, key, value)
            VALUES (${targetUserId}, ${key}, ${value})
            ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value
        `;
    }

    async isMultiUserEnabled(): Promise<boolean> {
        const value = await this.getSetting('multi_user_enabled', DEFAULT_USER_ID);
        return value === 'true';
    }

    // ========================================================================
    // Users
    // ========================================================================

    async getUser(id: string): Promise<User | undefined> {
        const rows = await this.getSql()`SELECT * FROM users WHERE id = ${id}`;
        return rows[0] as User | undefined;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const rows = await this.getSql()`SELECT * FROM users WHERE email = ${email}`;
        return rows[0] as User | undefined;
    }

    async listUsers(): Promise<User[]> {
        const rows = await this.getSql()`
            SELECT id, name, email, avatar, is_active, is_default, role, created_at, last_login_at
            FROM users
            WHERE is_active = true
            ORDER BY name ASC
        `;
        return rows as unknown as User[];
    }

    async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
        const rows = await this.getSql()`
            INSERT INTO users ${this.getSql()(user as any)}
            RETURNING id
        `;
        return { ...user, id: rows[0].id } as User;
    }

    async createDefaultUser(): Promise<void> {
        await this.getSql()`
            INSERT INTO users (id, name, is_default)
            VALUES (${DEFAULT_USER_ID}, 'Default', true)
            ON CONFLICT DO NOTHING
        `;
        logger.info('Default user created');
    }

    async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<void> {
        await this.getSql()`
            UPDATE users
            SET ${this.getSql()(updates as any)}
            WHERE id = ${id}
        `;
    }

    async deleteUser(id: string): Promise<void> {
        await this.getSql()`DELETE FROM users WHERE id = ${id}`;
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.getSql()`
            UPDATE users
            SET last_login_at = NOW()
            WHERE id = ${id}
        `;
    }

    // ========================================================================
    // Recipes
    // ========================================================================

    async getRecipe(name: string): Promise<Recipe | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM recipes
            WHERE name = ${name}
            AND user_id = ${UserContext.get()}
        `;
        return rows[0] as Recipe | undefined;
    }

    async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
        const rows = await this.getSql()`
            INSERT INTO recipes ${this.getSql()({ ...recipe, user_id: UserContext.get() } as any)}
            RETURNING id
        `;
        return { ...recipe, id: rows[0].id } as Recipe;
    }

    // ========================================================================
    // Entries
    // ========================================================================

    async getEntries(date: string): Promise<Entry[]> {
        return await this.getSql()`
            SELECT * FROM entries
            WHERE date = ${date}
            AND user_id = ${UserContext.get()}
            ORDER BY time ASC
        ` as Entry[];
    }

    async createEntry(date: string, time: string, type?: string): Promise<Entry> {
        const rows = await this.getSql()`
            INSERT INTO entries (date, time, type, user_id)
            VALUES (${date}, ${time}, ${type || null}, ${UserContext.get()})
            RETURNING id
        `;
        return { id: rows[0].id, date, time, type } as Entry;
    }

    async getEntryByDateTime(date: string, time: string): Promise<Entry | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM entries
            WHERE date = ${date}
            AND time = ${time}
            AND user_id = ${UserContext.get()}
        `;
        return rows[0] as Entry | undefined;
    }

    // ========================================================================
    // Dishes
    // ========================================================================

    async addDish(entryId: number, recipe: Recipe, amount: number): Promise<Dish> {
        const dishData = {
            user_id: UserContext.get(),
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
        const rows = await this.getSql()`
            INSERT INTO dishes ${this.getSql()(dishData as any)}
            RETURNING id
        `;
        return { id: rows[0].id, ...dishData } as Dish;
    }

    async getDishesForEntry(entryId: number): Promise<Dish[]> {
        return await this.getSql()`
            SELECT *,
                   ((CASE WHEN energy_unit = 'kj' THEN energy / 4.184 ELSE energy END) *
                    (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_energy,
                   (protein * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_protein,
                   (carbs * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_carbs,
                   (fat * (CASE WHEN weight_unit = 'oz' THEN amount * 28.3495 ELSE amount END) / 100) as total_fat
            FROM dishes
            WHERE entry_id = ${entryId}
            AND user_id = ${UserContext.get()}
        ` as unknown as Dish[];
    }

    // ========================================================================
    // History
    // ========================================================================

    async getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]> {
        return await this.getSql()`
            SELECT
                e.date,
                SUM(
                    (CASE WHEN d.energy_unit = 'kj' THEN d.energy / 4.184 ELSE d.energy END) *
                    (CASE WHEN d.weight_unit = 'oz' THEN d.amount * 28.3495 ELSE d.amount END) / 100
                ) as calories
            FROM entries e
            JOIN dishes d ON e.id = d.entry_id
            WHERE e.date >= ${startDate} AND e.date <= ${endDate}
            AND e.user_id = ${UserContext.get()}
            GROUP BY e.date
            ORDER BY e.date ASC
        ` as unknown as { date: string; calories: number }[];
    }

    // ========================================================================
    // Recognition Tasks
    // ========================================================================

    async createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask> {
        await this.getSql()`
            INSERT INTO recognition_tasks (id, status, image_path, user_id)
            VALUES (${id}, 'pending', ${imagePath || null}, ${UserContext.get()})
        `;
        return (await this.getRecognitionTask(id))!;
    }

    async updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>): Promise<void> {
        const allowedKeys: readonly ('status' | 'result' | 'error')[] = ['status', 'result', 'error'] as const;
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => allowedKeys.includes(key as typeof allowedKeys[number]))
        );

        if (Object.keys(validUpdates).length === 0) return;

        await this.getSql()`
            UPDATE recognition_tasks
            SET ${this.getSql()(validUpdates as any)},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
            AND user_id = ${UserContext.get()}
        `;
    }

    async getRecognitionTask(id: string): Promise<RecognitionTask | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM recognition_tasks
            WHERE id = ${id}
            AND user_id = ${UserContext.get()}
        `;
        return rows[0] as RecognitionTask | undefined;
    }

    // ========================================================================
    // Device Auth - Sessions
    // ========================================================================

    async createSession(userId: string, fingerprint: string, deviceName: string | null, expiresAt: Date): Promise<SessionRecord> {
        const rows = await this.getSql()`
            INSERT INTO sessions (user_id, fingerprint, device_name, expires_at)
            VALUES (${userId}, ${fingerprint}, ${deviceName}, ${expiresAt})
            RETURNING *
        `;
        return rows[0] as SessionRecord;
    }

    async getSession(id: number): Promise<SessionRecord | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM sessions WHERE id = ${id}
        `;
        return rows[0] as SessionRecord | undefined;
    }

    async getSessionByFingerprint(userId: string, fingerprint: string): Promise<SessionRecord | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM sessions
            WHERE user_id = ${userId}
            AND fingerprint = ${fingerprint}
            ORDER BY created_at DESC
            LIMIT 1
        `;
        return rows[0] as SessionRecord | undefined;
    }

    async updateSessionActivity(id: number): Promise<void> {
        await this.getSql()`
            UPDATE sessions
            SET last_active_at = NOW()
            WHERE id = ${id}
        `;
    }

    async deleteSession(id: number): Promise<void> {
        await this.getSql()`DELETE FROM sessions WHERE id = ${id}`;
    }

    async listSessions(userId: string): Promise<SessionRecord[]> {
        return await this.getSql()`
            SELECT * FROM sessions
            WHERE user_id = ${userId}
            ORDER BY last_active_at DESC
        ` as unknown as SessionRecord[];
    }

    // ========================================================================
    // Device Auth - Device Requests
    // ========================================================================

    async createDeviceRequest(userId: string, requestCode: string, deviceName: string | null): Promise<DeviceRequest> {
        const rows = await this.getSql()`
            INSERT INTO device_requests (user_id, request_code, device_name)
            VALUES (${userId}, ${requestCode}, ${deviceName})
            RETURNING *
        `;
        return rows[0] as DeviceRequest;
    }

    async getDeviceRequestByCode(requestCode: string): Promise<DeviceRequest | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM device_requests
            WHERE request_code = ${requestCode}
            AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT 1
        `;
        return rows[0] as DeviceRequest | undefined;
    }

    async getDeviceRequest(id: number): Promise<DeviceRequest | undefined> {
        const rows = await this.getSql()`
            SELECT * FROM device_requests WHERE id = ${id}
        `;
        return rows[0] as DeviceRequest | undefined;
    }

    async updateDeviceRequestStatus(id: number, status: 'approved' | 'denied' | 'expired'): Promise<void> {
        await this.getSql()`
            UPDATE device_requests
            SET status = ${status}, resolved_at = NOW()
            WHERE id = ${id}
        `;
    }

    async listPendingDeviceRequests(userId: string): Promise<DeviceRequest[]> {
        return await this.getSql()`
            SELECT * FROM device_requests
            WHERE user_id = ${userId}
            AND status = 'pending'
            AND created_at > NOW() - INTERVAL '10 minutes'
            ORDER BY created_at DESC
        ` as unknown as DeviceRequest[];
    }

    async expireOldDeviceRequests(userId: string, olderThanMinutes: number): Promise<void> {
        await this.getSql()`
            UPDATE device_requests
            SET status = 'expired', resolved_at = NOW()
            WHERE user_id = ${userId}
            AND status = 'pending'
            AND created_at < NOW() - make_interval(mins => ${olderThanMinutes})
        `;
    }
}
