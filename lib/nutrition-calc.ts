import { BodyData, DailyTargets, NutritionStandard } from './db/types';

/**
 * Mifflin-St Jeor Equation for BMR
 * Male: BMR = 10*weight + 6.25*height - 5*age + 5
 * Female: BMR = 10*weight + 6.25*height - 5*age - 161
 */
export function calculateBMR(data: BodyData): number {
    const { weight, height, age, sex } = data;
    if (sex === 'male') {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        return 10 * weight + 6.25 * height - 5 * age - 161;
    }
}

/**
 * TDEE = BMR * Activity Level
 */
export function calculateTDEE(data: BodyData): number {
    const bmr = calculateBMR(data);
    return Math.round(bmr * data.activity_level);
}

/**
 * Calculate Daily Targets based on TDEE and Standard
 * 
 * CN (Dietary Guidelines for Chinese Residents):
 * - Protein: 10-15% (Using 15% as target or 1.2g/kg weight, whichever is higher for satiety/muscle)
 * - Fat: 20-30%
 * - Carbs: 50-65%
 * 
 * US (Dietary Guidelines for Americans / DGA):
 * - Protein: 10-35%
 * - Fat: 20-35%
 * - Carbs: 45-65%
 * 
 * Balanced:
 * - Protein: 20-25%
 * - Fat: 25-30%
 * - Carbs: 45-55%
 */
export function calculateNutritionTargets(data: BodyData, standard: NutritionStandard): DailyTargets {
    const tdee = calculateTDEE(data);

    let pRatio = 0.15;
    let fRatio = 0.25;
    let cRatio = 0.60;

    switch (standard) {
        case 'CN':
            pRatio = 0.15;
            fRatio = 0.25;
            cRatio = 0.60;
            break;
        case 'US':
            pRatio = 0.20;
            fRatio = 0.30;
            cRatio = 0.50;
            break;
        case 'Balanced':
            pRatio = 0.25;
            fRatio = 0.25;
            cRatio = 0.50;
            break;
    }

    // Protein: 4 kcal/g, Fat: 9 kcal/g, Carbs: 4 kcal/g
    const protein = Math.round((tdee * pRatio) / 4);
    const fat = Math.round((tdee * fRatio) / 9);
    const carbs = Math.round((tdee * cRatio) / 4);

    return {
        energy: tdee,
        protein,
        fat,
        carbs
    };
}
