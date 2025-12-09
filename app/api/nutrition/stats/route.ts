import { NextRequest, NextResponse } from 'next/server';
import { getEntries, getDishesForEntry, getTarget } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    try {
        const entries = getEntries(date);
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        for (const entry of entries) {
            const dishes = getDishesForEntry(entry.id);
            for (const dish of dishes) {
                totalCalories += dish.total_energy || 0;
                totalProtein += dish.total_protein || 0;
                totalCarbs += dish.total_carbs || 0;
                totalFat += dish.total_fat || 0;
            }
        }

        const target = getTarget(date);

        return NextResponse.json({
            calories: totalCalories,
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat,
            targetCalories: target?.energy_target || 2500,
            targetProtein: target?.protein_target || 150,
            targetCarbs: target?.carbs_target || 250,
            targetFat: target?.fat_target || 80,
        });

    } catch (error) {
        logger.error(error as Error, 'Error fetching nutrition stats');
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
