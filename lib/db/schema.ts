import { pgTable, text, serial, real, timestamp, integer, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core';

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique(),
    password_hash: text('password_hash'),
    avatar: text('avatar'),
    is_active: boolean('is_active').default(true),
    is_default: boolean('is_default').default(false),
    role: text('role').default('user'),
    created_at: timestamp('created_at').defaultNow(),
    last_login_at: timestamp('last_login_at'),
    sso_provider: text('sso_provider'),
    sso_id: text('sso_id'),
});

export const recipes = pgTable('recipes', {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
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
    created_at: timestamp('created_at').defaultNow(),
});

export const entries = pgTable('entries', {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    time: text('time').notNull(),
    type: text('type'),
    created_at: timestamp('created_at').defaultNow(),
});

export const dishes = pgTable('dishes', {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
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
    created_at: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
    user_id: uuid('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value'),
}, (table) => [
    primaryKey({ columns: [table.user_id, table.key] }),
]);

export const recognition_tasks = pgTable('recognition_tasks', {
    id: text('id').primaryKey(),
    user_id: uuid('user_id')
        .notNull()
        .default(DEFAULT_USER_ID)
        .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    result: text('result'),
    error: text('error'),
    image_path: text('image_path'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('created_at').defaultNow().$onUpdate(() => new Date()),
});
