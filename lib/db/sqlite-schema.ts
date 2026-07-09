import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').unique(),
    password_hash: text('password_hash'),
    avatar: text('avatar'),
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
    is_default: integer('is_default', { mode: 'boolean' }).default(false),
    role: text('role').default('user'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
    last_login_at: text('last_login_at'),
    sso_provider: text('sso_provider'),
    sso_id: text('sso_id'),
});

export const recipes = sqliteTable('recipes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull().unique(),
    energy: real('energy'),
    energy_unit: text('energy_unit').default('kcal'),
    protein: real('protein'),
    carbs: real('carbs'),
    fat: real('fat'),
    weight_unit: text('weight_unit').default('g'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const entries = sqliteTable('entries', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    time: text('time').notNull(),
    type: text('type'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const dishes = sqliteTable('dishes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    entry_id: integer('entry_id')
        .notNull()
        .references(() => entries.id, { onDelete: 'cascade' }),
    recipe_id: integer('recipe_id')
        .notNull()
        .references(() => recipes.id),
    name: text('name'),
    amount: real('amount'),
    energy: real('energy'),
    energy_unit: text('energy_unit').default('kcal'),
    protein: real('protein'),
    carbs: real('carbs'),
    fat: real('fat'),
    weight_unit: text('weight_unit').default('g'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const settings = sqliteTable('settings', {
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value'),
}, (table) => [
    primaryKey({ columns: [table.user_id, table.key] }),
]);

export const recognition_tasks = sqliteTable('recognition_tasks', {
    id: text('id').primaryKey(),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    result: text('result'),
    error: text('error'),
    image_path: text('image_path'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
    updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const device_requests = sqliteTable('device_requests', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    request_code: text('request_code').notNull(),
    device_name: text('device_name'),
    status: text('status').notNull().default('pending'),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
    resolved_at: text('resolved_at'),
});

export const sessions = sqliteTable('sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: text('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    device_name: text('device_name'),
    fingerprint: text('fingerprint').notNull(),
    created_at: text('created_at').default('CURRENT_TIMESTAMP'),
    last_active_at: text('last_active_at').default('CURRENT_TIMESTAMP'),
    expires_at: text('expires_at').notNull(),
});
