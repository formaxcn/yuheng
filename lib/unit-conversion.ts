import { KJ_PER_KCAL, GRAMS_PER_OZ } from './constants';

/**
 * 将能量从千卡(kcal)转换为千焦(kJ)
 */
export function kcalToKj(kcal: number): number {
    return kcal * KJ_PER_KCAL;
}

/**
 * 将能量从千焦(kJ)转换为千卡(kcal)
 */
export function kjToKcal(kj: number): number {
    return kj / KJ_PER_KCAL;
}

/**
 * 将重量从盎司(oz)转换为克(g)
 */
export function ozToGrams(oz: number): number {
    return oz * GRAMS_PER_OZ;
}

/**
 * 将重量从克(g)转换为盎司(oz)
 */
export function gramsToOz(grams: number): number {
    return grams / GRAMS_PER_OZ;
}

/**
 * 根据单位计算总能量
 */
export function calculateTotalEnergy(
    energy: number,
    energyUnit: 'kcal' | 'kj',
    amount: number,
    weightUnit: 'g' | 'oz'
): number {
    const energyKcal = energyUnit === 'kj' ? kjToKcal(energy) : energy;
    const amountGrams = weightUnit === 'oz' ? ozToGrams(amount) : amount;
    return (energyKcal * amountGrams) / 100;
}
