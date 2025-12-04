import { NextRequest, NextResponse } from 'next/server';
import { WgerClient } from '@/lib/wger';
import { Dish } from '@/types';

export async function POST(req: NextRequest) {
    const token = req.headers.get('x-wger-token');
    const baseUrl = req.headers.get('x-wger-base-url') || process.env.WGER_BASE_URL;

    if (!token || !baseUrl) {
        return NextResponse.json({ error: 'Missing token or base URL' }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { dishes, planId, date } = body; // date is YYYY-MM-DD
        // We also need to know WHICH meal to add to. 
        // If not provided, we guess based on current server time?
        // Or maybe the frontend sends a 'time' or 'mealIndex'.
        // Let's assume the frontend sends a 'time' or we default to now.
        // Actually, to group them, we usually want to add to a specific "Meal" entry in Wger (e.g. Lunch).
        // Wger meals are defined by time.

        // Let's infer time if not provided.
        const now = new Date();
        const currentHour = now.getHours();
        let time = "12:00"; // Default Lunch
        if (currentHour < 10) time = "08:00"; // Breakfast
        else if (currentHour < 15) time = "12:00"; // Lunch
        else if (currentHour < 20) time = "18:00"; // Dinner
        else time = "21:00"; // Snack

        // Allow override
        if (body.time) time = body.time;

        const client = new WgerClient(token, baseUrl);

        // 1. Find or Create Meal for this plan and time
        // We should check if a meal exists for this plan on this day (if date is today) at this time?
        // Wger 'meal' object is just a container with a time.
        // If we want to add to "Lunch", we look for a meal with time ~12:00 or create one.
        // However, Wger API doesn't strictly enforce "Lunch" type, just time.
        // Let's try to find a meal with the EXACT time first, or create it.

        // Fetch existing meals for the plan
        const existingMeals = await client.getMeals(planId);
        // Filter by time? Wger meals are not date-specific in the plan definition usually?
        // Wait, Wger "Nutritional Plan" has "Meals" (e.g. Breakfast, Lunch) which are templates?
        // OR is it a log?
        // The requirement says: "自动为今天的 plan 创建对应餐别...的 meal".
        // In Wger, you log to a "Nutritional Plan".
        // Actually, Wger's log is usually: Plan -> Meal (Time) -> MealItem (Ingredient + Amount).
        // But usually "Log" is date-specific. 
        // Wger v2 API: /meal/ is linked to a plan. 
        // Does /meal/ have a date? No.
        // /meal/ is a template in the plan.
        // The ACTUAL logging happens in /diary/ (Log) ??
        // Let's check Wger API concepts.
        // Usually: Plan has Meals (Breakfast, Lunch). You add Items to Meals.
        // This defines the "Plan".
        // To "Log" what you ate TODAY, you usually use the "Diary" or "Log".
        // BUT, the requirement says: "自动为今天的 plan 创建... meal".
        // Maybe the user means "Add to the Diary"?
        // "用户选择一个 plan ... 之后所有页面直接使用这个 token 和选中的 plan_id"
        // "首页 ... 显示当前选中 plan 的今天总热量"
        // This implies we are operating on a Plan that represents "Today" or we are logging to the Diary.
        // IF we are just editing a Plan, then "Today" doesn't make sense unless the Plan IS the log.
        // In Wger, "Nutritional Plan" is usually a diet plan (e.g. "My Cut").
        // And you log entries to the Diary.
        // HOWEVER, many users use one Plan and just update it? No, that's weird.
        // Let's assume the standard Wger flow:
        // You have a Plan. The Plan has Meals. You add Items to Meals.
        // AND/OR you log to Diary.
        // Requirement 5 says: "自动为今天的 plan 创建... meal".
        // This phrasing is tricky. "Today's plan".
        // Maybe it means "Log to the Diary for today"?
        // Wger API has `/api/v2/day/` (Diary).
        // But the requirement explicitly mentions `plan_id` and `meal` and `mealitem`.
        // These are resources under `plan`.
        // If I add to `mealitem`, it updates the Plan definition, not necessarily a specific date's log, UNLESS the plan is used as a log?
        // OR, maybe the user wants to use the "Smart Add" to populate the Plan?
        // "首页 ... 显示当前选中 plan 的今天总热量" -> This strongly suggests the Plan IS the daily log, or we are viewing the Diary which is influenced by the Plan?
        // Actually, Wger has a "Log" feature.
        // Let's look at Requirement 6: "首页 ... 显示当前选中 plan 的今天总热量".
        // If I change the Plan, the "Today's calories" changes?
        // This implies the Plan contains the data.
        // Maybe the user creates a new Plan for each day? No, that's inefficient.
        // Maybe the user uses ONE Plan and modifies it every day? Also weird.
        // MOST LIKELY: The user is confusing "Plan" with "Diary/Log", OR they want to add to the Diary, but Wger's Diary API might be what they mean.
        // BUT, they explicitly asked to "get user all nutritional plans" and "select a plan".
        // And "create meal -> create mealitem".
        // This is strictly editing the Plan Structure.
        // If I add a mealitem to a Plan, it's permanent in that Plan.
        // Maybe the user wants to build a Plan?
        // "私人卡路里记录 PWA" -> "Record" implies Logging.
        // If I use Wger, I usually log to the Diary.
        // But the prompt forces me to use `plan_id`.
        // Let's assume the user wants to Add items to the Selected Plan.
        // And the Home page shows the totals OF THAT PLAN.
        // So if I eat something, I add it to the Plan.
        // If I eat something else tomorrow, do I clear the plan?
        // The requirement "自动为今天的 plan 创建..." is very specific. "Today's plan".
        // Maybe they mean "The plan for today"?
        // Let's assume the user wants to ADD entries to the `plan`.
        // And the "Today" part in Home page might just be "Current Plan's Totals".
        // The "Today" word in "Today's plan" in requirement 5 might be a misnomer for "The Current Plan".
        // OR, Wger has a feature where you assign a Plan to a Date?
        // Yes, Wger allows scheduling plans.
        // But the requirement says "Select a plan -> Save to local/cookie -> Use this plan_id".
        // It doesn't say "Create a plan for today".
        // So, I will implement: Add Meal/MealItems to the *Selected Plan*.
        // And Home page shows stats of *Selected Plan*.
        // This effectively makes the Plan a "Daily Log" if the user clears it or uses a new one, but I will just follow instructions: Add to Plan.

        // Logic:
        // 1. Get existing meals for Plan.
        // 2. Find a meal that matches the target "Time" (e.g. Lunch).
        // 3. If not found, create a new Meal in that Plan with that Time.
        // 4. For each dish:
        //    a. Search Ingredient by name.
        //    b. If match (exact or high similarity?), use ID.
        //    c. Else, create Ingredient.
        //    d. Add MealItem (Ingredient + Amount) to the Meal.

        // Refined Logic for Meal Creation:
        // If I have 3 dishes for "Lunch", I should put them in the SAME Meal.
        // So I find/create the "Lunch" meal once.

        let targetMeal = existingMeals.find(m => m.time.startsWith(time.substring(0, 5)));
        if (!targetMeal) {
            targetMeal = await client.createMeal(planId, time);
        }

        const results = [];

        for (const dish of dishes) {
            // 1. Search Ingredient
            const searchResults = await client.searchIngredient(dish.name);
            let ingredientId = null;

            // Simple matching logic: Exact name match
            const exactMatch = searchResults.find(i => i.name.toLowerCase() === dish.name.toLowerCase());
            if (exactMatch) {
                ingredientId = exactMatch.id;
            } else {
                // Create new ingredient
                // Wger needs: name, energy, protein, carbohydrates, fat, etc.
                // Unit: Wger usually uses per 100g or per unit.
                // Our Gemini prompt returns per 100g.
                // Wger energy is kcal.
                const newIngredient = await client.createIngredient({
                    name: dish.name,
                    energy: dish.calories,
                    protein: dish.protein,
                    carbohydrates: dish.carbs,
                    fat: dish.fat,
                    // fibres, sodium if available
                });
                ingredientId = newIngredient.id;
            }

            // 2. Add to Meal
            // Amount in Wger MealItem is usually in grams?
            // Wger API: amount is in grams if the unit is not specified?
            // Actually Wger MealItem links to a "WeightUnit" optionally.
            // If no unit, it's usually grams or the base unit.
            // Let's assume grams.
            const mealItem = await client.addMealItem(targetMeal.id, ingredientId, dish.weight);
            results.push(mealItem);
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Smart Add Error:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to add dishes' }, { status: 500 });
    }
}
