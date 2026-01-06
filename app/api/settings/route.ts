import { NextRequest, NextResponse } from 'next/server';
import { getMealConfig, saveSetting, getDailyTargets, saveDailyTargets, getUnitPreferences, saveUnitPreferences, getSetting } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const settingsSchema = z.object({
    meal_times: z.array(z.object({
        name: z.string(),
        start: z.number(),
        end: z.number(),
        default: z.string()
    })),
    other_meal_name: z.string().optional(),
    time_format: z.enum(['12h', '24h']).optional(),
    daily_targets: z.object({
        energy: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
    }),
    unit_preferences: z.object({
        energy: z.enum(['kcal', 'kj']),
        weight: z.enum(['g', 'oz']),
    }).optional(),
    recognition_language: z.enum(['zh', 'en']).optional(),
    region: z.enum(['CN', 'US']).optional(),
    llm_api_key: z.string().optional(),
    llm_model: z.string().optional()
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
 *               recognition_language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated
 */
export async function GET(req: NextRequest) {
    try {
        const meal_times = await getMealConfig();
        const daily_targets = await getDailyTargets();
        const unit_preferences = await getUnitPreferences();
        const recognition_language = (await getSetting('recognition_language')) || 'zh';
        const region = (await getSetting('region')) || 'CN';
        const llm_api_key = (await getSetting('llm_api_key')) || '';
        const llm_model = (await getSetting('llm_model')) || 'gemini-2.5-flash';
        const other_meal_name = (await getSetting('other_meal_name')) || 'Snack';
        const time_format = (await getSetting('time_format')) || '24h';
        return NextResponse.json({ meal_times, daily_targets, unit_preferences, recognition_language, region, llm_api_key, llm_model, other_meal_name, time_format });
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

        const { meal_times, daily_targets, unit_preferences, recognition_language, llm_api_key, llm_model, other_meal_name, time_format } = parsed.data;

        await saveSetting('meal_times', JSON.stringify(meal_times));
        await saveDailyTargets(daily_targets);
        if (unit_preferences) {
            await saveUnitPreferences(unit_preferences);
        }
        if (recognition_language) {
            await saveSetting('recognition_language', recognition_language);
        }
        if (parsed.data.region) {
            await saveSetting('region', parsed.data.region);
        }
        if (llm_api_key !== undefined) {
            await saveSetting('llm_api_key', llm_api_key);
        }
        if (llm_model) {
            await saveSetting('llm_model', llm_model);
        }
        if (other_meal_name) {
            await saveSetting('other_meal_name', other_meal_name);
        }
        if (time_format) {
            await saveSetting('time_format', time_format);
        }

        const currentUnitPrefs = await getUnitPreferences();
        const currentLang = (await getSetting('recognition_language')) || 'zh';
        return NextResponse.json({
            success: true,
            meal_times,
            daily_targets,
            unit_preferences: currentUnitPrefs,
            recognition_language: currentLang,
            region: (await getSetting('region')) || 'CN',
            llm_api_key: (await getSetting('llm_api_key')) || '',
            llm_model: (await getSetting('llm_model')) || 'gemini-2.5-flash',
            other_meal_name: (await getSetting('other_meal_name')) || 'Snack',
            time_format: (await getSetting('time_format')) || '24h'
        });
    } catch (error) {
        logger.error(error as Error, 'Failed to save settings');
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
