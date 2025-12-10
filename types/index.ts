export interface Dish {
  name: string;
  calories: number; // kcal per 100g
  protein: number; // g per 100g
  fat: number; // g per 100g
  carbs: number; // g per 100g
  weight: number; // total weight in grams
  description?: string;
}
