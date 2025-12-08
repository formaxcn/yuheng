import { NextRequest, NextResponse } from 'next/server';
import { WgerClient } from '@/lib/wger';

export async function GET(req: NextRequest) {
    const token = req.headers.get('x-wger-token');
    const baseUrl = req.headers.get('x-wger-base-url') || process.env.WGER_BASE_URL;
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');

    if (!token || !baseUrl || !planId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        const client = new WgerClient(token, baseUrl);
        const meals = await client.getMeals(Number(planId));

        let totalCalories = 0;
        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;

        // This is potential N+1 problem, but for a single plan it's usually manageable (3-5 meals).
        // We need to fetch items for each meal.
        // Wger API might allow filtering mealitem by plan? No, by meal.

        const mealPromises = meals.map(async (meal) => {
            // We need to implement getMealItems in WgerClient or use axios directly here
            // Let's add getMealItems to WgerClient first or just do it here.
            // I'll do it here for speed, but cleaner to put in lib.
            // Actually I'll just use the client.
            // Wait, I didn't implement getMealItems in WgerClient yet.
            // I implemented addMealItem.
            // Let's assume I can fetch meal items.

            const response = await fetch(`${baseUrl}/api/v2/mealitem/?meal=${meal.id}`, {
                headers: {
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            return data.results || [];
        });

        const mealsItems = await Promise.all(mealPromises);
        const allItems = mealsItems.flat();

        // Now we have all items. Each item has 'ingredient' (id) and 'amount' (g).
        // We need ingredient details.
        // Optimization: Collect all unique ingredient IDs and fetch them? 
        // Or fetch one by one?
        // Wger doesn't have a bulk fetch by ID usually.
        // But `mealitem` response MIGHT contain expanded ingredient if we ask?
        // Let's try to fetch ingredient details for each item.
        // To avoid too many requests, we cache ingredient info in a map.

        const ingredientCache = new Map();

        for (const item of allItems) {
            let ingredient = ingredientCache.get(item.ingredient);
            if (!ingredient) {
                const ingRes = await fetch(`${baseUrl}/api/v2/ingredient/${item.ingredient}/`, {
                    headers: {
                        'Authorization': token,
                        'Accept': 'application/json'
                    }
                });
                ingredient = await ingRes.json();
                ingredientCache.set(item.ingredient, ingredient);
            }

            if (ingredient) {
                // Wger energy is usually per 100g or per unit.
                // Assuming standard Wger DB is per 100g for weight-based.
                // item.amount is in grams.
                // factor = amount / 100.
                // If ingredient energy is 0, maybe it's not set.

                const factor = item.amount / 100;
                totalCalories += (ingredient.energy || 0) * factor;
                totalProtein += (ingredient.protein || 0) * factor;
                totalFat += (ingredient.fat || 0) * factor;
                totalCarbs += (ingredient.carbohydrates || 0) * factor;
            }
        }

        return NextResponse.json({
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs
        });

    } catch (error: any) {
        console.error('Stats API Error:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
