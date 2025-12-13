// Unit conversion utilities for YuHeng

export type EnergyUnit = 'kcal' | 'kj';
export type WeightUnit = 'g' | 'oz';

// Conversion constants
const KCAL_TO_KJ = 4.184;
const GRAMS_TO_OZ = 0.035274;
const OZ_TO_GRAMS = 28.3495;

// Energy conversions
export function kcalToKj(kcal: number): number {
    return kcal * KCAL_TO_KJ;
}

export function kjToKcal(kj: number): number {
    return kj / KCAL_TO_KJ;
}

export function convertEnergy(value: number, from: EnergyUnit, to: EnergyUnit): number {
    if (from === to) return value;
    return from === 'kcal' ? kcalToKj(value) : kjToKcal(value);
}

// Weight conversions
export function gramsToOz(grams: number): number {
    return grams * GRAMS_TO_OZ;
}

export function ozToGrams(oz: number): number {
    return oz * OZ_TO_GRAMS;
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
    if (from === to) return value;
    return from === 'g' ? gramsToOz(value) : ozToGrams(value);
}

// Formatting helpers
export function formatEnergy(value: number, unit: EnergyUnit): string {
    const convertedValue = unit === 'kj' ? kcalToKj(value) : value;
    return `${Math.round(convertedValue)} ${unit}`;
}

export function formatWeight(value: number, unit: WeightUnit): string {
    const convertedValue = unit === 'oz' ? gramsToOz(value) : value;
    const decimals = unit === 'oz' ? 1 : 0;
    return `${convertedValue.toFixed(decimals)}${unit}`;
}

// Display value helpers (return just the number, formatted)
export function displayEnergy(valueInKcal: number, unit: EnergyUnit): number {
    return Math.round(unit === 'kj' ? kcalToKj(valueInKcal) : valueInKcal);
}

export function displayWeight(valueInGrams: number, unit: WeightUnit): number {
    if (unit === 'oz') {
        return Math.round(gramsToOz(valueInGrams) * 10) / 10; // 1 decimal place
    }
    return Math.round(valueInGrams);
}

// Convert input value back to base units (kcal, grams)
export function inputToKcal(value: number, fromUnit: EnergyUnit): number {
    return fromUnit === 'kj' ? kjToKcal(value) : value;
}

export function inputToGrams(value: number, fromUnit: WeightUnit): number {
    return fromUnit === 'oz' ? ozToGrams(value) : value;
}

// Unit preference defaults
export interface UnitPreferences {
    energy: EnergyUnit;
    weight: WeightUnit;
}

export const DEFAULT_UNIT_PREFS: UnitPreferences = {
    energy: 'kcal',
    weight: 'g'
};
