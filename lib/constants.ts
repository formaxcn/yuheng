import type { UnitPreferences } from './db/types';

// 数据库初始化默认配置

export const DEFAULT_MEAL_CONFIG = [
    { name: "Breakfast", start: 6, end: 10, default: "08:00" },
    { name: "Lunch", start: 10, end: 14, default: "12:00" },
    { name: "Dinner", start: 17, end: 19, default: "18:00" }
];

export const DEFAULT_DAILY_TARGETS = { energy: 2000, protein: 150, carbs: 200, fat: 65 };

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = { energy: 'kcal', weight: 'g' };

export const DEFAULT_SETTINGS = [
    { key: 'recognition_language', val: 'zh' },
    { key: 'region', val: 'CN' },
    { key: 'time_format', val: '24h' },
    { key: 'other_meal_name', val: 'Snack' },
    { key: 'llm_provider', val: 'gemini' },
    { key: 'llm_model', val: 'gemini-2.5-flash' },
    { key: 'llm_base_url', val: '' },
    { key: 'queue_concurrency', val: '5' },
    { key: 'queue_retry_limit', val: '3' }
] as const;

// 时间相关常量
export const POLLING_INTERVAL_MS = 3000;
export const QUEUE_RETRY_DELAY_SECONDS = 30;
export const NETWORK_RECOVERY_DELAY_MS = 1000;
