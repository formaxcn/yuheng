# YuHeng Future Roadmap (Draft)

## Feature Priority Matrix

| Feature | Priority | Effort | Status | Notes |
|---------|----------|--------|--------|-------|
| Calendar View | P1 | Low | ⏳ Planned | Natural extension of existing history |
| Meal Plan Presets | P1 | Low | ⏳ Planned | Extend existing settings framework |
| Health Mode Switch | P1 | Low | ⏳ Planned | UI emphasis on different nutrition metrics |
| PWA Support | P2 | Medium | 📋 Planning | Next.js built-in support |
| Calendar Image Sharing | P2 | Medium | 📋 Planning | Frontend generated, no storage needed |
| Pre/Post Meal Comparison | P2 | Medium | 📋 Planning | High value user insights |
| Blood Sugar Risk Assessment | P3 | Medium-High | 📋 Planning | Requires carb/GI database |
| Lipid / Vascular Pressure Assessment | P3 | Medium-High | 📋 Planning | Requires fat/cholesterol breakdown data |
| Purine Risk Assessment | P3 | Medium-High | 📋 Planning | For gout-prone users |
| Liver Risk Assessment | P4 | High | 📋 Planning | Requires medical model, use caution |

---

## Architecture Decision Records

### ADR 1: Calendar Image Storage - No S3/MinIO

**Decision: Frontend generation + Frontend consumption**

```
User clicks "Share" → html2canvas generates image → User saves/shares → Image discarded
```

**Rationale:**
1. Share images are "generate-and-consume", no persistence needed
2. Frontend html2canvas/satori fully meets requirements
3. Zero storage cost, zero network overhead
4. For future short-link sharing, PostgreSQL bytea + TTL is sufficient
5. Consider S3/MinIO only when user base exceeds 100k+

**Implementation Plan:**
- Install `html2canvas`
- Create `components/calendar/ShareButton.tsx`

---

## Implementation Roadmap

### ⏳ Phase 1: High Value, Low Effort (Next 1-2 Weeks)

#### Calendar View for Nutrition History
- [ ] Calendar grid component showing daily calories
- [ ] Click date to view detailed entries
- [ ] Based on existing `getHistory` API

#### Meal Plan Presets
- [ ] Preset templates: Bulk, Cut, Maintenance, Low-Carb
- [ ] `default_meal_plan` setting
- [ ] Onboarding flow for new users

#### Health Mode Switch
- [ ] `health_focus` setting: general | glycemic | lipid | purine
- [ ] UI highlights corresponding nutrition metrics

---

### 📋 Phase 2: Medium Effort (2-3 Weeks, Planning)

#### PWA Support
- [ ] `public/manifest.json` configuration
- [ ] Enable PWA in `next.config.ts`
- [ ] Service Worker for offline data caching strategy

#### Calendar Image Sharing
- [ ] `html2canvas` integration
- [ ] `ShareButton` component
- [ ] WeChat Moments support (1080x1920)
- [ ] Watermark and branding

#### Pre/Post Meal Comparison
- [x] Architecture and data model designed (✅ 2026-05-12)
- [ ] Measurement records table (dual DB support: PostgreSQL + SQLite)
- [ ] Pluggable metric analyzer framework
- [ ] Nutrition comparison analyzer (Phase 1)
- [ ] Blood glucose analyzer skeleton (Phase 2)
- [ ] Comparison API endpoints
- [ ] ComparisonCard UI component
- [ ] Comparison analysis page

**Architecture Design:**
- Pluggable metric system: nutrition → glucose → uric acid → lipid
- Dual database adapter pattern (PostgreSQL JSONB + SQLite TEXT)
- Comparison result caching for performance
- See: [features/comparison_analysis.md](features/comparison_analysis.md)

---

### 📋 Phase 3: Health Risk Assessment (Long-term Planning)

#### Health Risk Models
- [ ] Blood sugar risk assessment model (requires GI database)
- [ ] Lipid / vascular pressure assessment
- [ ] Purine risk assessment (requires purine database)
- [ ] Disclaimer system

---

## Code Organization Plan

```
lib/
├── health/               ← Phase 3 (Planned)
│   ├── glycemic.ts       # Blood sugar assessment
│   ├── lipid.ts          # Lipid assessment
│   └── purine.ts         # Purine assessment

components/
├── calendar/             ← Phase 1 (Planned)
│   ├── CalendarGrid.tsx
│   ├── DayCell.tsx
│   └── ShareButton.tsx   ← Phase 2
├── health/               ← Phase 3 (Planned)
│   ├── RiskIndicator.tsx
│   └── ReportCard.tsx
└── meal-plans/           ← Phase 1 (Planned)
    └── PresetSelector.tsx
```

---

## Important Notes

### Health Risk Features
- **Must** add explicit disclaimer: "This assessment is for reference only, does not constitute medical diagnosis"
- Recommend citing authoritative sources (WHO, Chinese Nutrition Society, etc.)
- Avoid medical terms like "diagnosis", "treatment"; use "risk indication", "reference advice" instead

### Data Migration
- Set default values when adding `user_id` columns to avoid orphaned existing data
- Need data ownership strategy when migrating to real users in future

---

## Open Discussion Items

- [ ] Data source selection for health risk assessment (open source vs paid API)
- [ ] PWA offline caching strategy (which data needs offline availability)
- [ ] Data model design for pre/post meal comparison
