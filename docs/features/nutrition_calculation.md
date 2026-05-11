# Nutrition Calculation & Goals

YuHeng helps users set personalized nutritional targets based on their body metrics and prefered dietary standards.

## Body Metrics
Users can input the following data in the **Settings > Body Information** section:
- **Height** (cm)
- **Weight** (kg)
- **Age**
- **Sex** (Male/Female)
- **Activity Level** (Sedentary to Extra Active)

These metrics are used to calculate the **Basal Metabolic Rate (BMR)** and **Total Daily Energy Expenditure (TDEE)**.

## Calculation Logic
The application uses the **Mifflin-St Jeor Equation** to estimate BMR, which is widely considered one of the most accurate formulas.

### 1. BMR Calculation
- **Men**: `(10 × weight) + (6.25 × height) - (5 × age) + 5`
- **Women**: `(10 × weight) + (6.25 × height) - (5 × age) - 161`

### 2. TDEE Calculation
TDEE is calculated by multiplying BMR by an Activity Factor:
- **Sedentary**: 1.2
- **Lightly Active**: 1.375
- **Moderately Active**: 1.55
- **Very Active**: 1.725
- **Extra Active**: 1.9

## Nutritional Standards
Users can choose how their TDEE is distributed into macronutrients (Protein, Fats, Carbs) based on different dietary guidelines:

| Standard | Protein | Fat | Carbs | Description |
|----------|---------|-----|-------|-------------|
| **China (CN)** | 15% | 25% | 60% | Based on Chinese Dietary Guidelines (CRDA), emphasizing higher carbohydrate intake (grains, rice). |
| **US (US)** | 20% | 30% | 50% | Based on USDA AMDR, typically higher in protein and fats. |
| **Balanced** | 25% | 25% | 50% | A general fitness-oriented split, good for moderate activity and muscle maintenance. |

## Quick Actions
- **Calculate Suggestions**: In the Settings page, clicking this button automatically populates the "Daily Nutrition Targets" fields (Energy, Protein, Carbs, Fat) based on the inputs above.
