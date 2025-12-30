# Unit Preferences & Conversion

YuHeng provides a robust system for handling different nutritional and weight units, allowing users to track their intake in the units they are most comfortable with.

## Supported Units

### Energy
- **kcal** (Kilocalories): The default unit for energy tracking.
- **kJ** (Kilojoules): Commonly used in Australia, New Zealand, and parts of Europe.
- Conversion: `1 kcal ≈ 4.184 kJ`

### Weight
- **g** (Grams): The default metric unit for food weight and macronutrients.
- **oz** (Ounces): The imperial unit for weight.
- Conversion: `1 g ≈ 0.035274 oz`

## Implementation Details

The core conversion logic is centralized in `lib/units.ts`.

### Base Units
Internally, YuHeng stores all data in **base units**:
- Energy: `kcal`
- Weight: `grams`

Conversions only happen during **input** (when saving to the database) and **output** (when displaying to the user).

### Formatting Helpers
The system provides several helper functions for clean UI rendering:
- `displayEnergy(value, unit)`: Returns a rounded number based on the preferred unit.
- `displayWeight(value, unit)`: Returns a number with appropriate decimal places (1 for `oz`, 0 for `g`).
- `formatEnergy` / `formatWeight`: Returns a string with the value and unit unit suffix.

## User Configuration

Users can switch their preferred units in the **Settings** page. Changing these settings only affects how data is displayed; existing logs in the database remain consistent because they are stored in base units.
