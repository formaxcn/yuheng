import { NextRequest, NextResponse } from 'next/server';
import { getEntries, getDishesForEntry, getDailyTargets, getHistory, getMealConfig, getUnitPreferences, getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/nutrition/stats:
 *   get:
 *     summary: Get nutrition stats for a specific date
 *     description: Returns daily nutrition statistics including calories, protein, carbs, fat, and meal breakdowns. Also returns history for the last 7 days.
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to fetch stats for (YYYY-MM-DD). Defaults to today.
 *     responses:
 *       200:
 *         description: Nutrition stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calories:
 *                   type: number
 *                 protein:
 *                   type: number
 *                 carbs:
 *                   type: number
 *                 fat:
 *                   type: number
 *                 targetCalories:
 *                   type: number
 *                 meals:
 *                   type: array
 *                   items:
 *                     type: object
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const days = parseInt(searchParams.get('days') || '7', 10);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    try {
        const entries = await getEntries(date);
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        let history;
        if (start && end) {
            history = await getHistory(start, end);
        } else {
            const historyStartDate = new Date(date);
            historyStartDate.setDate(historyStartDate.getDate() - (days - 1));
            const historyStartDateStr = historyStartDate.toISOString().split('T')[0];
            history = await getHistory(historyStartDateStr, date);
        }

        const mealConfig = await getMealConfig();
        const otherName = (await getSetting('other_meal_name')) || "Snack";

        interface MealStats {
            type: string;
            calories: number;
        }

        const meals: { [key: string]: MealStats } = {};

        // Initialize with defined meals
        for (const meal of mealConfig) {
            meals[meal.name] = { type: meal.name, calories: 0 };
        }
        // Ensure "other" category exists
        if (!meals[otherName]) {
            meals[otherName] = { type: otherName, calories: 0 };
        }

        for (const entry of entries) {
            const dishes = await getDishesForEntry(entry.id);
            let entryCalories = 0;
            for (const dish of dishes) {
                const cals = dish.total_energy || 0;
                totalCalories += cals;
                totalProtein += dish.total_protein || 0;
                totalCarbs += dish.total_carbs || 0;
                totalFat += dish.total_fat || 0;
                entryCalories += cals;
            }

            // Aggregate by meal type
            // If type matches one of our keys, use it
            // Otherwise fall back to the "other" category
            const type = entry.type || otherName;

            if (meals[type]) {
                meals[type].calories += entryCalories;
            } else {
                // Unknown type (e.g. legacy 'Snack' when name changed to 'Treats') -> group into other
                meals[otherName].calories += entryCalories;
            }
        }

        const targets = await getDailyTargets();
        const unitPrefs = await getUnitPreferences();

        // Normalize targets to base units (kcal, g) if they were saved in others
        const normalizedTargetCalories = unitPrefs.energy === 'kj' ? targets.energy / 4.184 : targets.energy;
        const normalizeWeight = (val: number) => unitPrefs.weight === 'oz' ? val / 0.035274 : val;

        return NextResponse.json({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            targetCalories: normalizedTargetCalories,
            targetProtein: normalizeWeight(targets.protein),
            targetCarbs: normalizeWeight(targets.carbs),
            targetFat: normalizeWeight(targets.fat),
            meals: Object.values(meals),
            history
        });

    } catch (error) {
        logger.error(error as Error, 'Error fetching nutrition stats');
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

