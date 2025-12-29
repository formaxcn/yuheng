# System Design & Flows

This document details the core logic and integration flows of YuHeng.

## Meal Recognition Flow

YuHeng supports multiple LLM providers (Gemini, OpenAI, etc.) to transform unstructured user input into structured nutritional data.

### 1. Asynchronous recognition (Recommended)
When a user uploads a photo:
1.  The system creates a `RecognitionTask` in the database with a unique ID and status `pending`.
2.  The backend triggers the LLM analysis in a non-blocking background process.
3.  The frontend polls the `/api/nutrition/tasks/[id]` endpoint to monitor the status.
4.  Once the LLM returns the JSON list of dishes, the task status is set to `completed`.
5.  This allows the user to continue interacting with the app while processing happens.

### 2. Manual Food Recognition (Refining)
Users can refine the AI's predictions:
1.  If the AI misidentifies an item, the user can click "Edit" and provide a text instruction (e.g., "The meat is actually beef").
2.  The system sends the instruction along with the original dish data back to the LLM (mode: `fix`).
3.  The LLM returns an updated dish object.

### 3. Packaged Food & OCR
-   The AI is instructed to look for nutrition tables and prioritize "per 100g/ml" or "per serving" data.
-   It also extract product names and weight information from the labels.
-   Variables like `lang_instruction` are injected into the prompt to ensure the output matches the user's preferred language.

## Portions and Meal Sharing

YuHeng includes logic for shared meals:
-   **Total Weight Recognition**: The AI estimates the *total* weight of the dish in the photo.
-   **Sharing Mode**: Users can enable "Meal Sharing" and specify the number of people or their personal percentage (e.g., 50% of the total dish).
-   **Final Logging**: The app automatically scales the weight and nutrition values by the personal percentage before saving it to the journal.

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
