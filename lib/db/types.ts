export interface DailyTargets {
    energy: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface UnitPreferences {
    energy: 'kcal' | 'kj';
    weight: 'g' | 'oz';
}

export interface Recipe {
    id: number;
    name: string;
    energy: number;
    energy_unit: 'kcal' | 'kj';
    protein: number;
    carbs: number;
    fat: number;
    weight_unit: 'g' | 'oz';
    created_at?: string;
}

export interface Entry {
    id: number;
    date: string;
    time: string;
    type?: string;
    created_at?: string;
    dishes?: Dish[];
}

export interface Dish {
    id: number;
    entry_id: number;
    recipe_id: number;
    amount: number;
    name: string;
    energy: number;
    energy_unit: 'kcal' | 'kj';
    protein: number;
    carbs: number;
    fat: number;
    weight_unit: 'g' | 'oz';
    created_at?: string;
    total_energy?: number;
    total_protein?: number;
    total_carbs?: number;
    total_fat?: number;
}

export interface RecognitionTask {
    id: string;
    status: 'uploading' | 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: string;
    error?: string;
    image_path?: string;
    created_at: string;
    updated_at: string;
}
