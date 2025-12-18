export interface Dish {
  name: string;
  calories: number;
  energy_unit?: 'kcal' | 'kj';
  protein: number;
  fat: number;
  carbs: number;
  weight: number;
  weight_unit?: 'g' | 'oz';
  description?: string;
}
