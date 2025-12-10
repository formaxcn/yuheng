import { NextRequest, NextResponse } from 'next/server';
import { getMealConfig, saveSetting, getDailyTargets, saveDailyTargets } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const settingsSchema = z.object({
    meal_times: z.object({
        Breakfast: z.object({ start: z.number(), end: z.number(), default: z.string() }),
        Lunch: z.object({ start: z.number(), end: z.number(), default: z.string() }),
        Dinner: z.object({ start: z.number(), end: z.number(), default: z.string() }),
        other: z.object({ name: z.string() }).optional(), // Configurable default meal name
    }),
    daily_targets: z.object({
        energy: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    })
});

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get application settings
 *     responses:
 *       200:
 *         description: Settings object
 *   post:
 *     summary: Update application settings
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meal_times:
 *                 type: object
 *               daily_targets:
 *                 type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */
export async function GET(req: NextRequest) {
    try {
        const meal_times = getMealConfig();
        const daily_targets = getDailyTargets();
        return NextResponse.json({ meal_times, daily_targets });
    } catch (error) {
        logger.error(error as Error, 'Failed to fetch settings');
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = settingsSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid settings format', details: parsed.error }, { status: 400 });
        }

        const { meal_times, daily_targets } = parsed.data;

        saveSetting('meal_times', JSON.stringify(meal_times));
        saveDailyTargets(daily_targets);

        return NextResponse.json({ success: true, meal_times, daily_targets });
    } catch (error) {
        logger.error(error as Error, 'Failed to save settings');
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
