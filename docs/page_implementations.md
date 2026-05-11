# Page Implementations

This document describes the design and implementation of the primary pages in YuHeng.

## 1. HomePage (`app/page.tsx`)

The dashboard providing a quick look at daily progress.

-   **Key Components**:
    -   **Circular Progress**: Visual representation of calorie intake vs. target.
    -   **Macro Bars**: Progress bars for Protein, Carbs, and Fat.
    -   **Meal Breakdown**: Tiles showing energy consumed in each meal category (Breakfast, Lunch, etc.).
    -   **History Chart**: A 7-day bar chart showing calorie trends.
-   **Data Fetching**: Uses `api.getStats()` and `api.getSettings()` in a `useEffect` hook.

## 2. Add Meal Page (`app/add/page.tsx`)

A multi-functional interface for logging food.

-   **Features**:
    -   **Input Methods**: Accepts plain text descriptions or camera/gallery uploads.
    -   **Backfilling**: Users can toggle custom dates and times.
    -   **Real-time Analysis**: Communicates with `/api/nutrition/analyze` and `/api/nutrition/fix` for AI processing.
    -   **Interactive List**: Allows users to adjust quantities or remove items before saving.

## 3. Settings Page (`app/settings/page.tsx`)

Allows users to personalize the application.

-   **Sections**:
    -   **Body Information**: Input height, weight, age, and activity level to auto-calculate targets.
    -   **Daily Targets**: Set goals for Calories and Macros.
    -   **Meal Times**: Define the start and end hours for meal classification.
    -   **Unit Preferences**: Switch between `kcal`/`kj` and `g`/`oz`.
-   **Persistence**: Data is saved to the `settings` table via `/api/settings`.

## Shared Components (`components/ui`)

YuHeng leverages a set of atomic UI components built on top of Radix UI:
-   `Button`, `Card`, `Input`, `Progress`, `Slider`
-   `Toast`: Used for confirming saved data or notifying about errors.
