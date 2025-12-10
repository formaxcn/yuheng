import { NextRequest, NextResponse } from 'next/server';
import { getEntries, getDishesForEntry, getDailyTargets, getHistory } from '@/lib/db';
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

    try {
        const entries = getEntries(date);
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        const historyStartDate = new Date(date);
        historyStartDate.setDate(historyStartDate.getDate() - 6);
        const historyStartDateStr = historyStartDate.toISOString().split('T')[0];
        const history = await getHistory(historyStartDateStr, date);

        interface MealStats {
            type: string;
            calories: number;
        }

        const meals: { [key: string]: MealStats } = {
            Breakfast: { type: 'Breakfast', calories: 0 },
            Lunch: { type: 'Lunch', calories: 0 },
            Dinner: { type: 'Dinner', calories: 0 },
            Snack: { type: 'Snack', calories: 0 },
        };

        for (const entry of entries) {
            const dishes = getDishesForEntry(entry.id);
            let entryCalories = 0;
            for (const dish of dishes) {
                const cals = dish.total_energy || 0;
                totalCalories += cals;
                totalProtein += dish.total_protein || 0;
                totalCarbs += dish.total_carbs || 0;
                totalFat += dish.total_fat || 0;
                entryCalories += cals;
            }

            // Aggregate by meal type (or time if type not explicitly set correctly everywhere, but we try to rely on type)
            // If type is missing, infer it? smart-add infers it.
            const type = entry.type || 'Snack';
            if (meals[type]) {
                meals[type].calories += entryCalories;
            } else {
                // Fallback for unknown types (e.g. customized types or older data) -> count as Snack
                if (!meals['Snack']) meals['Snack'] = { type: 'Snack', calories: 0 };
                meals['Snack'].calories += entryCalories;
            }
        }

        const targets = getDailyTargets();

        return NextResponse.json({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            targetCalories: targets.energy,
            targetProtein: targets.protein,
            targetCarbs: targets.carbs,
            targetFat: targets.fat,
            meals: Object.values(meals),
            history
        });

    } catch (error) {
        logger.error(error as Error, 'Error fetching nutrition stats');
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

