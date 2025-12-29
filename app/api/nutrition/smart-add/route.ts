import { NextRequest, NextResponse } from 'next/server';
import { getRecipe, createRecipe, getEntryByDateTime, createEntry, addDish, getMealConfig, getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * @swagger
 * /api/nutrition/smart-add:
 *   post:
 *     summary: Add dishes to a meal entry
 *     description: Analyzes dishes and adds them to a meal entry. Supports backfilling by date and time/type.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dishes]
 *             properties:
 *               dishes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     weight:
 *                       type: number
 *                     calories:
 *                       type: number
 *                     protein:
 *                       type: number
 *                     carbs:
 *                       type: number
 *                     fat:
 *                       type: number
 *               date:
 *                 type: string
 *                 format: date
 *                 description: YYYY-MM-DD
 *               time:
 *                 type: string
 *                 description: HH:MM, optional if type is provided
 *               type:
 *                 type: string
 *                 enum: [Breakfast, Lunch, Dinner, Snack]
 *                 description: Optional, overrides time inference if provided
 *     responses:
 *       200:
 *         description: Dishes added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dishes, date, time, type } = body;
        // date: YYYY-MM-DD
        // time: HH:MM (Optional)
        // type: Meal Type string (Optional)

        const targetDate = date || new Date().toISOString().split('T')[0];
        const config = await getMealConfig();

        let targetTime = time;
        let targetType = type;

        // Logic:
        // 1. If TYPE given but no TIME -> Use default time from config for that type.
        // 2. If TIME given -> Determine TYPE from config ranges.
        // 3. If NEITHER -> Use current time and determine type.

        if (targetType && !targetTime) {
            // Case 1: Type provided (Backfill), infer Default Time
            const typeConfig = config.find((m: any) => m.name === targetType);
            if (typeConfig && typeConfig.default) {
                targetTime = typeConfig.default;
            } else {
                targetTime = "12:00"; // Fallback
            }
        } else if (!targetTime) {
            // Case 3: No type, no time -> Current time
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            targetTime = `${hours}:${minutes}`;
        }

        if (!targetType && targetTime) {
            const hour = parseInt(targetTime.split(':')[0]);
            const otherName = (await getSetting('other_meal_name')) || 'Snack';

            targetType = otherName; // Default
            for (const meal of config) {
                if (hour >= meal.start && hour < meal.end) {
                    targetType = meal.name;
                    break;
                }
            }
        }

        // 1. Find or Create Entry
        // We use the determined targetTime and targetType
        let entry = await getEntryByDateTime(targetDate, targetTime);
        if (!entry) {
            entry = await createEntry(targetDate, targetTime, targetType);
        }

        const results = [];

        for (const dish of dishes) {
            // 2. Find or Create Recipe
            let recipe = await getRecipe(dish.name);
            if (!recipe) {
                recipe = await createRecipe({
                    name: dish.name,
                    energy: dish.calories,
                    energy_unit: dish.energy_unit || 'kcal',
                    protein: dish.protein,
                    carbs: dish.carbs,
                    fat: dish.fat,
                    weight_unit: dish.weight_unit || 'g',
                });
            }

            // 3. Add Dish to Entry
            const newDish = await addDish(entry.id, recipe, dish.weight);
            results.push(newDish);
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        logger.error(error as Error, 'Smart Add Error');
        return NextResponse.json({ error: 'Failed to add dishes' }, { status: 500 });
    }
}
