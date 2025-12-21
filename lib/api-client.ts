import { Dish } from '@/types';
import { EnergyUnit, WeightUnit } from './units';

export interface RecognitionTask {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result?: Dish[];
    error?: string;
    created_at: string;
    updated_at: string;
}

export interface Settings {
    meal_times: {
        [key: string]: {
            start?: number;
            end?: number;
            default?: string;
            name?: string;
        };
    };
    daily_targets: {
        energy: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    unit_preferences: {
        energy: EnergyUnit;
        weight: WeightUnit;
    };
    recognition_language: 'zh' | 'en';
    region: 'CN' | 'US';
}

export interface NutritionStats {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    meals: { type: string; calories: number }[];
    history: { date: string; calories: number }[];
}

export const api = {
    // Nutrition
    async getStats(): Promise<NutritionStats> {
        const res = await fetch('/api/nutrition/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    async startRecognition(image: string): Promise<{ taskId: string }> {
        const res = await fetch('/api/nutrition/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image })
        });
        if (!res.ok) throw new Error('Failed to start recognition');
        return res.json();
    },

    async getRecognitionTask(id: string): Promise<RecognitionTask> {
        const res = await fetch(`/api/nutrition/tasks/${id}`);
        if (!res.ok) throw new Error('Failed to fetch task');
        return res.json();
    },

    async smartAdd(data: { dishes: Dish[]; date?: string; time?: string; type?: string }): Promise<{ success: boolean; results: any[] }> {
        const res = await fetch('/api/nutrition/smart-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to add dishes');
        return res.json();
    },

    // Gemini (Direct Fix/Add)
    async geminiFix(data: { mode: 'fix'; userPrompt: string; dish: Partial<Dish>; image?: string }): Promise<Dish> {
        const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to fix dish');
        return res.json();
    },

    // Settings
    async getSettings(): Promise<Settings> {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
    },

    async saveSettings(settings: Settings): Promise<{ success: boolean }> {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error('Failed to save settings');
        return res.json();
    }
};
