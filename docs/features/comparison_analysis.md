# Comparison Analysis Feature (Pre/Post Meal)

## Overview

**Comparison Analysis** is an extensible framework for analyzing pre-meal vs post-meal biometric data. It starts with nutrition intake comparison and is designed to support future extensions like blood glucose, uric acid, and lipid measurements.

**Status:** ✅ Architecture Designed | ⏳ Implementation Pending

---

## Core Principles

### 1. Pluggable Metric System
Each biometric type is implemented as a separate analyzer plugin:
- **Nutrition**: Calories, Protein, Carbs, Fat (Phase 1)
- **Blood Glucose**: Blood sugar levels (Phase 2)
- **Uric Acid**: Purine metabolism (Phase 3)
- **Lipids**: Cholesterol, triglycerides (Phase 4)

All analyzers implement the same `IMetricAnalyzer` interface, enabling consistent UI presentation.

### 2. Dual Database Compatibility
Supports both **PostgreSQL** (production) and **SQLite** (development/desktop):
- PostgreSQL: Uses `jsonb` for efficient querying of dynamic values
- SQLite: Uses `text` storage with application-layer JSON parsing
- Adapter pattern abstracts database differences

### 3. Separation of Concerns
```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│  ComparisonCard  |  ComparisonPage  |  DetailPage       │
├─────────────────────────────────────────────────────────┤
│              Comparison Service Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Nutrition  │  │  Glucose    │  │  Uric Acid  │     │
│  │  Analyzer   │  │  Analyzer   │  │  Analyzer   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│              Database Adapter Layer                      │
│  PostgresAdapter  |  SqliteAdapter                      │
└─────────────────────────────────────────────────────────┘
```

---

## Data Model

### Measurement Table

Stores all biometric measurements with flexible schema:

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| user_id | String | User identifier |
| type | String | Measurement type: `nutrition`, `glucose`, `uric_acid`, `lipid` |
| timing | String | When measured: `before`, `after`, `fasting`, `random` |
| date | Date | Measurement date |
| time | Time | Measurement time |
| entry_id | Integer | Associated meal entry (nullable) |
| values | JSON | Dynamic values: `{ calories, protein, carbs, fat }` or `{ glucose }` |
| unit | String | Measurement unit |
| notes | Text | User notes |
| created_at | Timestamp | Creation time |

### Meal Comparison Table

Caches comparison results for performance:

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| entry_id | Integer | Associated meal entry |
| meal_type | String | Breakfast/Lunch/Dinner/Snack |
| before_measurement_id | Integer | Pre-meal measurement |
| after_measurement_id | Integer | Post-meal measurement |
| delta | JSON | Calculated differences: `{ metric: { before, after, change, changePercent }}` |
| meal_summary | JSON | Meal nutrition summary |
| analysis_type | String | Which analyzer produced this |
| created_at | Timestamp | Creation time |

### TypeScript Interfaces

```typescript
// lib/db/types.ts
export enum MeasurementType {
  NUTRITION = 'nutrition',
  BLOOD_GLUCOSE = 'glucose',
  URIC_ACID = 'uric_acid',
  LIPID = 'lipid',
}

export enum MeasurementTiming {
  BEFORE_MEAL = 'before',
  AFTER_MEAL = 'after',
  FASTING = 'fasting',
  RANDOM = 'random',
}

export interface Measurement {
  id: number;
  userId: string;
  type: MeasurementType;
  timing: MeasurementTiming;
  date: string;
  time: string;
  entryId?: number;
  values: Record<string, number>;
  unit: string;
  notes?: string;
  createdAt: string;
}

export interface MealComparison {
  id: number;
  entryId: number;
  mealType: string;
  mealTime: string;
  before?: { measurementId: number; values: Record<string, number>; time: string };
  after?: { measurementId: number; values: Record<string, number>; time: string };
  delta: Record<string, { before: number; after: number; change: number; changePercent: number }>;
  mealSummary: { totalCalories: number; totalCarbs: number; totalProtein: number; totalFat: number; dishCount: number };
  analysisType: MeasurementType;
  createdAt: string;
}
```

---

## Database Schema

### PostgreSQL (`drizzle/pg/schema.ts`)

```typescript
export const measurements = pgTable('measurements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  timing: varchar('timing', { length: 20 }).notNull(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  entryId: integer('entry_id').references(() => entries.id),
  values: jsonb('values').notNull(),
  unit: varchar('unit', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const meal_comparisons = pgTable('meal_comparisons', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').references(() => entries.id).unique(),
  mealType: varchar('meal_type', { length: 20 }),
  beforeMeasurementId: integer('before_measurement_id').references(() => measurements.id),
  afterMeasurementId: integer('after_measurement_id').references(() => measurements.id),
  delta: jsonb('delta').notNull(),
  mealSummary: jsonb('meal_summary').notNull(),
  analysisType: varchar('analysis_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### SQLite (`drizzle/sqlite/schema.ts`)

```typescript
export const measurements = sqliteTable('measurements', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: text('type').notNull(),
  timing: text('timing').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  entryId: integer('entry_id').references(() => entries.id),
  values: text('values').notNull(),
  unit: text('unit'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const meal_comparisons = sqliteTable('meal_comparisons', {
  id: integer('id').primaryKey(),
  entryId: integer('entry_id').references(() => entries.id).unique(),
  mealType: text('meal_type'),
  beforeMeasurementId: integer('before_measurement_id').references(() => measurements.id),
  afterMeasurementId: integer('after_measurement_id').references(() => measurements.id),
  delta: text('delta').notNull(),
  mealSummary: text('meal_summary').notNull(),
  analysisType: text('analysis_type').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
```

---

## Core Architecture

### IMetricAnalyzer Interface

```typescript
// lib/comparison/service.ts
export interface IMetricAnalyzer {
  type: MeasurementType;

  calculateDelta(
    before: Record<string, number>,
    after: Record<string, number>
  ): Record<string, { before: number; after: number; change: number; changePercent: number }>;

  getDisplayConfig(): {
    title: string;
    metrics: {
      key: string;
      label: string;
      unit: string;
      color: string;
      normalRange?: [number, number];
    }[];
  };

  generateInsights(comparison: MealComparison): string[];
}
```

### Comparison Service

```typescript
export class ComparisonService {
  private analyzers: Map<MeasurementType, IMetricAnalyzer> = new Map();

  registerAnalyzer(analyzer: IMetricAnalyzer) {
    this.analyzers.set(analyzer.type, analyzer);
  }

  getAnalyzer(type: MeasurementType): IMetricAnalyzer | undefined {
    return this.analyzers.get(type);
  }

  getRegisteredTypes(): MeasurementType[] {
    return Array.from(this.analyzers.keys());
  }

  async getMealComparison(
    entryId: number,
    analysisType: MeasurementType
  ): Promise<MealComparison> {
    // 1. Check cache first
    // 2. If not cached, fetch measurements and calculate
    // 3. Cache result for future queries
  }

  async getDailyComparisons(
    date: string,
    analysisType: MeasurementType
  ): Promise<MealComparison[]> {
    // Get all entries for date + their comparisons
  }
}

// Singleton instance
export const comparisonService = new ComparisonService();
comparisonService.registerAnalyzer(new NutritionAnalyzer());
```

### Nutrition Analyzer (Phase 1)

```typescript
// lib/comparison/analyzers/nutrition.ts
export class NutritionAnalyzer implements IMetricAnalyzer {
  type = MeasurementType.NUTRITION;

  calculateDelta(before: Record<string, number>, after: Record<string, number>) {
    // For nutrition: before = 0 (empty stomach), after = meal nutrition
    const result: Record<string, any> = {};
    for (const key of ['calories', 'protein', 'carbs', 'fat']) {
      const beforeVal = before[key] || 0;
      const afterVal = after[key] || 0;
      result[key] = {
        before: beforeVal,
        after: afterVal,
        change: afterVal - beforeVal,
        changePercent: beforeVal === 0 ? Infinity : ((afterVal - beforeVal) / beforeVal) * 100,
      };
    }
    return result;
  }

  getDisplayConfig() {
    return {
      title: 'Nutrition Intake',
      metrics: [
        { key: 'calories', label: 'Energy', unit: 'kcal', color: '#ef4444' },
        { key: 'carbs', label: 'Carbohydrates', unit: 'g', color: '#22c55e' },
        { key: 'protein', label: 'Protein', unit: 'g', color: '#3b82f6' },
        { key: 'fat', label: 'Fat', unit: 'g', color: '#f97316' },
      ],
    };
  }

  generateInsights(comparison: MealComparison): string[] {
    const insights: string[] = [];
    if (comparison.mealSummary.totalCarbs > 100) {
      insights.push('High carb meal - may cause significant blood glucose response');
    }
    if (comparison.mealSummary.totalProtein > 30) {
      insights.push('Good protein intake - helps with satiety and muscle repair');
    }
    return insights;
  }
}
```

---

## API Endpoints

### GET `/api/comparison/daily/[date]?type=nutrition`

Get all meal comparisons for a specific date.

**Response:**
```json
{
  "date": "2026-05-12",
  "analysisType": "nutrition",
  "comparisons": [
    {
      "id": 1,
      "entryId": 42,
      "mealType": "Breakfast",
      "mealTime": "08:30",
      "delta": {
        "calories": { "before": 0, "after": 450, "change": 450, "changePercent": 100 },
        "carbs": { "before": 0, "after": 45, "change": 45, "changePercent": 100 },
        "protein": { "before": 0, "after": 20, "change": 20, "changePercent": 100 },
        "fat": { "before": 0, "after": 18, "change": 18, "changePercent": 100 }
      },
      "mealSummary": {
        "totalCalories": 450,
        "totalCarbs": 45,
        "totalProtein": 20,
        "totalFat": 18,
        "dishCount": 2
      }
    }
  ]
}
```

### GET `/api/comparison/meal/[entryId]?type=nutrition`

Get detailed comparison for a single meal.

### POST `/api/comparison/measurements`

Create a new measurement record.

**Body:**
```json
{
  "type": "glucose",
  "timing": "after",
  "date": "2026-05-12",
  "time": "09:30",
  "entryId": 42,
  "values": { "glucose": 7.8 },
  "unit": "mmol/L",
  "notes": "2 hours after breakfast"
}
```

---

## UI Components

### ComparisonCard

Located at `components/comparison/ComparisonCard.tsx`.

Displays:
- Meal type and time
- 4 metric tiles with before/after values
- Change indicators (color coded)
- Meal nutrition summary
- Generated insights
- View detail button

### ComparisonPage

Located at `app/comparison/page.tsx`.

Features:
- Analysis type tabs (Nutrition | Glucose | ...)
- Date selector with prev/next buttons
- Vertical list of ComparisonCards
- Empty state handling

### ComparisonDetailPage

Located at `app/comparison/[entryId]/page.tsx`.

Features:
- Full meal breakdown
- Detailed analysis
- Measurement history timeline
- Manual measurement entry

---

## Implementation Checklist

### Phase 1: Data Layer
- [ ] Add interfaces to `lib/db/types.ts`
- [ ] Extend `IDatabaseAdapter` in `lib/db/interface.ts`
- [ ] Add tables to `drizzle/pg/schema.ts`
- [ ] Add tables to `drizzle/sqlite/schema.ts`
- [ ] Generate PostgreSQL migration
- [ ] Generate SQLite migration
- [ ] Implement methods in `lib/db/postgres.ts`
- [ ] Implement methods in `lib/db/sqlite.ts` (with JSON.parse handling)

### Phase 2: Analysis Service
- [ ] Create `lib/comparison/service.ts`
- [ ] Create `lib/comparison/analyzers/nutrition.ts`
- [ ] Create `lib/comparison/analyzers/blood-glucose.ts` (skeleton)
- [ ] Create `lib/comparison/analyzers/index.ts` (export all)

### Phase 3: API
- [ ] Create `app/api/comparison/daily/[date]/route.ts`
- [ ] Create `app/api/comparison/meal/[entryId]/route.ts`
- [ ] Create `app/api/comparison/measurements/route.ts`
- [ ] Extend `lib/api-client.ts`

### Phase 4: UI
- [ ] Create `components/comparison/ComparisonCard.tsx`
- [ ] Create `components/comparison/MetricComparisonItem.tsx`
- [ ] Create `app/comparison/page.tsx`
- [ ] Create `app/comparison/[entryId]/page.tsx`
- [ ] Add navigation link to dashboard

### Phase 5: Integration & Tests
- [ ] Add homepage comparison summary card
- [ ] Implement auto-association of measurements to meals
- [ ] Unit tests for NutritionAnalyzer
- [ ] Integration tests for API endpoints
- [ ] Manual testing with both databases

---

## Extension Guide: Adding a New Metric

### Step 1: Add to MeasurementType enum

```typescript
export enum MeasurementType {
  // ... existing
  NEW_METRIC = 'new_metric',
}
```

### Step 2: Create analyzer

```typescript
// lib/comparison/analyzers/new-metric.ts
export class NewMetricAnalyzer implements IMetricAnalyzer {
  type = MeasurementType.NEW_METRIC;

  calculateDelta(before, after) { /* ... */ }
  getDisplayConfig() { /* ... */ }
  generateInsights(comparison) { /* ... */ }
}
```

### Step 3: Register analyzer

```typescript
// lib/comparison/service.ts
comparisonService.registerAnalyzer(new NewMetricAnalyzer());
```

**Done!** UI will automatically support the new metric type.

---

## Database Compatibility Notes

### Key Differences

| Feature | PostgreSQL | SQLite |
|---------|-----------|--------|
| JSON Storage | `jsonb` type, automatically parsed | `text` type, needs `JSON.parse()` |
| Auto Increment | `serial` type | `integer PRIMARY KEY` |
| Timestamps | `timestamp` type | ISO strings in `text` |
| Foreign Keys | Enforced by drizzle | `PRAGMA foreign_keys = ON` |
| Conflict Resolution | `ON CONFLICT ... DO UPDATE` | `INSERT OR REPLACE` |

### Adapter Implementation Pattern

```typescript
// PostgreSQL - jsonb is automatically parsed
async getMeasurements(filters) {
  const rows = await this.sql`SELECT * FROM measurements ...`;
  return rows as Measurement[];
}

// SQLite - manual JSON parsing
async getMeasurements(filters) {
  const rows = stmt.all(...) as any[];
  return rows.map(row => ({
    ...row,
    values: JSON.parse(row.values),
  })) as Measurement[];
}
```

---

## Performance Considerations

1. **Caching Strategy**: `meal_comparisons` table caches computed results
2. **Batch Queries**: Daily comparison fetches all entries in single query
3. **Lazy Loading**: Detail view fetches full data only when needed
4. **Indexing**: Add indexes on `user_id`, `date`, `entry_id`, `type`

---

## Open Questions

1. **Auto-association Logic**: How to automatically match measurements to meals?
   - Time window based (e.g., 2 hours after meal = post-meal)
   - User manual selection fallback

2. **Measurement Input Methods**:
   - Manual number entry (simple)
   - Bluetooth device sync (future)
   - Photo recognition of meter displays (future)

3. **Historical Data Migration**:
   - Existing meal entries don't have pre-meal measurements
   - Backfill strategy?

4. **Visualization Options**:
   - Trend line over time
   - Meal type comparison (breakfast vs lunch response)
   - Correlation analysis (carbs vs glucose delta)

---

## Related Documents

- [Database Adapter Design](../design/database_adapter.md)
- [Roadmap Draft](../roadmap_draft.md)
- [Architecture Overview](../design/architecture.md)
