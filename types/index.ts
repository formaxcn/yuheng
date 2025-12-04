export interface Dish {
  name: string;
  calories: number; // kcal per 100g
  protein: number; // g per 100g
  fat: number; // g per 100g
  carbs: number; // g per 100g
  weight: number; // total weight in grams
  description?: string;
}

export interface WgerPlan {
  id: number;
  creation_date: string;
  description: string;
  has_goal: boolean;
}

export interface WgerMeal {
  id: number;
  plan: number;
  time: string; // e.g. "08:00"
}

export interface WgerIngredient {
  id: number;
  name: string;
  energy: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fibres?: number;
  sodium?: number;
}

export interface WgerMealItem {
  id: number;
  meal: number;
  ingredient: number;
  amount: number; // grams
}

export interface UserSettings {
  wgerToken: string;
  wgerBaseUrl: string;
  planId: number | null;
}
