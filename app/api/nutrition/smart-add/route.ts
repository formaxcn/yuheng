import { NextRequest, NextResponse } from 'next/server';
import { getRecipe, createRecipe, getEntryByDateTime, createEntry, addDish, Recipe } from '@/lib/db';
import { logger } from '@/lib/logger';
import { Dish } from '@/types'; // Frontend Dish type

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dishes, date, time } = body;
        // date: YYYY-MM-DD, time: HH:MM (Optional, default to current/context)

        const targetDate = date || new Date().toISOString().split('T')[0];

        // Infer time if not provided, similar to before
        let targetTime = time;
        if (!targetTime) {
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour < 10) targetTime = "08:00"; // Breakfast
            else if (currentHour < 15) targetTime = "12:00"; // Lunch
            else if (currentHour < 20) targetTime = "18:00"; // Dinner
            else targetTime = "21:00"; // Snack
        }

        // 1. Find or Create Entry
        let entry = getEntryByDateTime(targetDate, targetTime);
        if (!entry) {
            let type = "Snack";
            const hour = parseInt(targetTime.split(':')[0]);
            if (hour < 10) type = "Breakfast";
            else if (hour < 15) type = "Lunch";
            else if (hour < 20) type = "Dinner";

            entry = createEntry(targetDate, targetTime, type);
        }

        const results = [];

        for (const dish of dishes) {
            // 2. Find or Create Recipe
            let recipe = getRecipe(dish.name);
            if (!recipe) {
                recipe = createRecipe({
                    name: dish.name,
                    energy: dish.calories, // AI provides kcal/100g usually? 
                    // Wait, frontend dish.calories might be TOTAL or PER 100g?
                    // app/add/page.tsx says: Calories: {Math.round(dish.calories * dish.weight / 100)} kcal
                    // So dish.calories is per 100g. Correct.
                    protein: dish.protein,
                    carbs: dish.carbs,
                    fat: dish.fat,
                });
            }

            // 3. Add Dish to Entry
            // Frontend sends weight in grams.
            const newDish = addDish(entry.id, recipe, dish.weight);
            results.push(newDish);
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(error as Error, 'Smart Add Error');
        return NextResponse.json({ error: 'Failed to add dishes' }, { status: 500 });
    }
}
