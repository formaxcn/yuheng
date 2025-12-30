import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder) => {
  pgm.createTable('recipes', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    name: {
      type: 'TEXT',
      notNull: true,
      unique: true,
    },
    energy: {
      type: 'REAL',
    },
    energy_unit: {
      type: 'TEXT',
      default: 'kcal',
    },
    protein: {
      type: 'REAL',
    },
    carbs: {
      type: 'REAL',
    },
    fat: {
      type: 'REAL',
    },
    weight_unit: {
      type: 'TEXT',
      default: 'g',
    },
    created_at: {
      type: 'TIMESTAMP',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createTable('entries', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    date: {
      type: 'TEXT',
      notNull: true,
    },
    time: {
      type: 'TEXT',
      notNull: true,
    },
    type: {
      type: 'TEXT',
    },
    created_at: {
      type: 'TIMESTAMP',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createTable('dishes', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    entry_id: {
      type: 'INTEGER',
      notNull: true,
      references: 'entries(id)',
      onDelete: 'CASCADE',
    },
    recipe_id: {
      type: 'INTEGER',
      notNull: true,
      references: 'recipes(id)',
    },
    name: {
      type: 'TEXT',
    },
    amount: {
      type: 'REAL',
    },
    energy: {
      type: 'REAL',
    },
    energy_unit: {
      type: 'TEXT',
      default: 'kcal',
    },
    protein: {
      type: 'REAL',
    },
    carbs: {
      type: 'REAL',
    },
    fat: {
      type: 'REAL',
    },
    weight_unit: {
      type: 'TEXT',
      default: 'g',
    },
    created_at: {
      type: 'TIMESTAMP',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createTable('settings', {
    key: {
      type: 'TEXT',
      primaryKey: true,
    },
    value: {
      type: 'TEXT',
    },
  });

  pgm.createTable('recognition_tasks', {
    id: {
      type: 'TEXT',
      primaryKey: true,
    },
    status: {
      type: 'TEXT',
      notNull: true,
    },
    result: {
      type: 'TEXT',
    },
    error: {
      type: 'TEXT',
    },
    image_path: {
      type: 'TEXT',
    },
    created_at: {
      type: 'TIMESTAMP',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};

export const down = (pgm: MigrationBuilder) => {
  pgm.dropTable('recognition_tasks');
  pgm.dropTable('settings');
  pgm.dropTable('dishes');
  pgm.dropTable('entries');
  pgm.dropTable('recipes');
};
