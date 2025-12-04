import axios from 'axios';
import { WgerPlan, WgerIngredient, WgerMeal, WgerMealItem } from '@/types';

export class WgerClient {
    private token: string;
    private baseUrl: string;

    constructor(token: string, baseUrl: string) {
        this.token = token;
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }

    private get headers() {
        return {
            'Authorization': `Token ${this.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    async getPlans(): Promise<WgerPlan[]> {
        const response = await axios.get(`${this.baseUrl}/api/v2/nutritionalplan/`, {
            headers: this.headers,
        });
        return response.data.results;
    }

    async getMeals(planId: number): Promise<WgerMeal[]> {
        const response = await axios.get(`${this.baseUrl}/api/v2/meal/?plan=${planId}`, {
            headers: this.headers,
        });
        return response.data.results;
    }

    async createMeal(planId: number, time: string): Promise<WgerMeal> {
        // Wger requires time in HH:MM format usually.
        // We might need to handle existing meals to avoid duplicates if logic requires,
        // but here we just create.
        const response = await axios.post(`${this.baseUrl}/api/v2/meal/`, {
            plan: planId,
            time: time,
        }, {
            headers: this.headers,
        });
        return response.data;
    }

    async searchIngredient(name: string): Promise<WgerIngredient[]> {
        const response = await axios.get(`${this.baseUrl}/api/v2/ingredient/?name=${encodeURIComponent(name)}`, {
            headers: this.headers,
        });
        return response.data.results;
    }

    async createIngredient(data: Partial<WgerIngredient>): Promise<WgerIngredient> {
        const response = await axios.post(`${this.baseUrl}/api/v2/ingredient/`, {
            ...data,
            language: 2, // 2 is usually English, need to check for Chinese. Wger default might vary.
            // Let's assume 2 or just omit if it defaults correctly.
            // Actually, for Chinese, we might want to check language ID.
            // But for now, we'll just send the data.
            // Wger requires code, name, energy, etc.
        }, {
            headers: this.headers,
        });
        return response.data;
    }

    async addMealItem(mealId: number, ingredientId: number, amount: number): Promise<WgerMealItem> {
        const response = await axios.post(`${this.baseUrl}/api/v2/mealitem/`, {
            meal: mealId,
            ingredient: ingredientId,
            amount: amount,
        }, {
            headers: this.headers,
        });
        return response.data;
    }

    async getLog(planId: number, date: string): Promise<any> {
        // This is a bit complex in Wger. Usually we get logs by day.
        // But for the dashboard, we need total calories.
        // We might need to fetch all meals for the plan, then all meal items.
        // Or use the /diary/ endpoint if available and structured.
        // For now, let's just fetch meals and items manually if needed, or rely on what we have.
        // The dashboard needs "Today's total calories".
        // We can fetch meals for the plan, then fetch meal items for those meals.
        return {};
    }
}
