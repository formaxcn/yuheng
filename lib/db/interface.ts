import {
    Recipe, Entry, Dish, RecognitionTask, DailyTargets, UnitPreferences, User
} from './types';

export interface IDatabaseAdapter {
    init(): Promise<void>;

    // Settings (user-scoped with fallback to global)
    getSetting(key: string, userId?: string): Promise<string | undefined>;
    saveSetting(key: string, value: string, userId?: string): Promise<void>;
    isMultiUserEnabled(): Promise<boolean>;

    // Users
    getUser(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    listUsers(): Promise<User[]>;
    createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User>;
    updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<void>;
    deleteUser(id: string): Promise<void>;
    updateLastLogin(id: string): Promise<void>;

    // Recipes
    getRecipe(name: string): Promise<Recipe | undefined>;
    createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe>;

    // Entries
    getEntries(date: string): Promise<Entry[]>;
    createEntry(date: string, time: string, type?: string): Promise<Entry>;
    getEntryByDateTime(date: string, time: string): Promise<Entry | undefined>;

    // Dishes
    addDish(entryId: number, recipe: Recipe, amount: number): Promise<Dish>;
    getDishesForEntry(entryId: number): Promise<Dish[]>;

    // History
    getHistory(startDate: string, endDate: string): Promise<{ date: string; calories: number; }[]>;

    // Recognition Tasks
    createRecognitionTask(id: string, imagePath?: string): Promise<RecognitionTask>;
    updateRecognitionTask(id: string, updates: Partial<Pick<RecognitionTask, 'status' | 'result' | 'error'>>): Promise<void>;
    getRecognitionTask(id: string): Promise<RecognitionTask | undefined>;
}
