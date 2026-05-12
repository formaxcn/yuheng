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

export interface RecognizedDish {
  name: string;
  description?: string;
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
  energy_unit?: 'kcal' | 'kj';
  weight_unit?: 'g' | 'oz';
}
