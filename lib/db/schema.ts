import { pgTable, text, serial, real, timestamp, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const recipes = pgTable('recipes', {
    id: serial('id').primaryKey(),
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
    date: text('date').notNull(),
    time: text('time').notNull(),
    type: text('type'),
    created_at: timestamp('created_at').defaultNow(),
});

export const dishes = pgTable('dishes', {
    id: serial('id').primaryKey(),
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
    key: text('key').primaryKey(),
    value: text('value'),
});

export const recognition_tasks = pgTable('recognition_tasks', {
    id: text('id').primaryKey(),
    status: text('status').notNull(),
    result: text('result'),
    error: text('error'),
    image_path: text('image_path'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});
