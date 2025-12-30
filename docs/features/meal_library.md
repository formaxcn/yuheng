# Recipe Library & Snapshotting

YuHeng maintains a local library of dished and recipes you've logged, allowing for faster entry and consistent data over time.

## Fast Re-entry
The system remembers recipes you've created. When you start typing a dish name, it can suggest matching items from your local library, saving you from needing AI recognition for every single meal.

## Automatic Snapshotting
A critical architectural feature of YuHeng is **Snapshotting**:
- When you add a dish to a meal entry, the system creates a "snapshot" of that recipe's nutritional values (calories, protein, etc.) at that exact moment.
- **Why it matters**: If you change the ingredients or nutrition data of a recipe in your library later, your *historical* logs remain unchanged. This ensures your past nutrition data stays accurate even as your recipes evolve.

## Persistent Storage
All your custom recipes and food data are stored locally on your device (in SQLite) or in your private PostgreSQL database, ensuring your food library is always available even without an internet connection (depending on your setup).
