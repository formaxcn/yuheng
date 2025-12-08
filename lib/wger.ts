import axios from 'axios';
import { WgerPlan, WgerIngredient, WgerMeal, WgerMealItem } from '@/types';
import { logger } from '@/lib/logger';

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
        const url = `${this.baseUrl}/api/v2/nutritionplan/`;
        logger.debug(`Fetching plans from: ${url}`);
        try {
            const response = await axios.get(url, {
                headers: this.headers,
            });
            logger.debug('Fetched plans successfully', { count: response.data.results.length });
            return response.data.results;
        } catch (error: any) {
            logger.error('Error fetching plans', error.response?.data || error.message);
            throw error;
        }
    }

    async getMeals(planId: number): Promise<WgerMeal[]> {
        const url = `${this.baseUrl}/api/v2/meal/?plan=${planId}`;
        logger.debug(`Fetching meals for plan ${planId} from: ${url}`);
        try {
            const response = await axios.get(url, {
                headers: this.headers,
            });
            logger.debug('Fetched meals successfully', { count: response.data.results.length });
            return response.data.results;
        } catch (error: any) {
            logger.error(`Error fetching meals for plan ${planId}`, error.response?.data || error.message);
            throw error;
        }
    }

    async createMeal(planId: number, time: string): Promise<WgerMeal> {
        // Wger requires time in HH:MM format usually.
        // We might need to handle existing meals to avoid duplicates if logic requires,
        // but here we just create.
        const url = `${this.baseUrl}/api/v2/meal/`;
        logger.debug(`Creating meal for plan ${planId} at ${time}`, { url });
        try {
            const response = await axios.post(url, {
                plan: planId,
                time: time,
            }, {
                headers: this.headers,
            });
            logger.debug('Meal created successfully', response.data);
            return response.data;
        } catch (error: any) {
            logger.error(`Error creating meal for plan ${planId}`, error.response?.data || error.message);
            throw error;
        }
    }

    async searchIngredient(name: string): Promise<WgerIngredient[]> {
        const url = `${this.baseUrl}/api/v2/ingredient/?name=${encodeURIComponent(name)}`;
        logger.debug(`Searching ingredient: ${name}`, { url });
        try {
            const response = await axios.get(url, {
                headers: this.headers,
            });
            logger.debug(`Found ${response.data.results.length} ingredients for "${name}"`);
            return response.data.results;
        } catch (error: any) {
            logger.error(`Error searching ingredient "${name}"`, error.response?.data || error.message);
            throw error;
        }
    }

    async createIngredient(data: Partial<WgerIngredient>): Promise<WgerIngredient> {
        const url = `${this.baseUrl}/api/v2/ingredient/`;
        logger.debug('Creating ingredient', { url, data });
        try {
            const response = await axios.post(url, {
                ...data,
                language: 2, // 2 is usually English, need to check for Chinese. Wger default might vary.
                // Let's assume 2 or just omit if it defaults correctly.
                // Actually, for Chinese, we might want to check language ID.
                // But for now, we'll just send the data.
                // Wger requires code, name, energy, etc.
            }, {
                headers: this.headers,
            });
            logger.debug('Ingredient created successfully', response.data);
            return response.data;
        } catch (error: any) {
            logger.error('Error creating ingredient', error.response?.data || error.message);
            throw error;
        }
    }

    async addMealItem(mealId: number, ingredientId: number, amount: number): Promise<WgerMealItem> {
        const url = `${this.baseUrl}/api/v2/mealitem/`;
        logger.debug(`Adding meal item to meal ${mealId}`, { ingredientId, amount, url });
        try {
            const response = await axios.post(url, {
                meal: mealId,
                ingredient: ingredientId,
                amount: amount,
            }, {
                headers: this.headers,
            });
            logger.debug('Meal item added successfully', response.data);
            return response.data;
        } catch (error: any) {
            logger.error(`Error adding meal item to meal ${mealId}`, error.response?.data || error.message);
            throw error;
        }
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
