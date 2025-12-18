# System Design & Flows

This document details the core logic and integration flows of YuHeng.

## Meal Recognition Flow

YuHeng uses Google Gemini AI to transform unstructured user input (text or images) into structured nutritional data.

### 1. Text Analysis
When a user types "2 eggs and a piece of toast", the system:
1.  Calls `analyzeImage` (with a blank image or just the prompt logic).
2.  Gemini returns a JSON list of dishes with estimated weight, protein, carbs, and fat.
3.  The system checks the `recipes` table to see if these items exist. If not, it creates them.

### 2. Image Recognition
When a user uploads a photo:
1.  The image is sent to Gemini with a specialized prompt requesting a breakdown of visible food items.
2.  The UI shows a "Refining" state while processing.
3.  The result is parsed into individual `dishes`.

## Backfilling Logic

YuHeng allows users to add meals for past dates or specific times.

-   **Date/Time selection**: Users can pick a date and time in the "Add Meal" page.
-   **Meal Type classification**: The system automatically classifies the meal based on the time:
    -   `06:00 - 10:00`: Breakfast
    -   `10:00 - 14:00`: Lunch
    -   `17:00 - 19:00`: Dinner
    -   `Other`: Snack
-   These thresholds are configurable in the Settings.

## Statistics Calculation

Nutritional stats are calculated on-the-fly or aggregated via SQL:

-   **Energy**: Often stored in both `kcal` and `kj`. The display logic converts between them based on user preference (`lib/units.ts`).
-   **Daily Progress**: The `HomePage` fetches stats for the current day and compares them against `daily_targets` stored in the `settings` table.
-   **Snapshotting**: When a dish is added to an entry, its nutritional values at that moment are copied (snapshotted) into the `dishes` table. This ensures that changing a recipe's nutrition later doesn't affect historical logs.
