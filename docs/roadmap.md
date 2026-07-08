# YuHeng Roadmap

## Release History

### v0.3 - Current (Multi-User & Status)
**Released: May 2026**

#### Multi-User Support
- [x] Database Schema
  - `users` table with password hashing, roles, and SSO fields
  - `user_id` foreign key columns on all tables with default system user
  - Composite primary key `(user_id, key)` for settings table
  - Cascading delete constraints and indexes
- [x] Backend Core
  - `UserContext` class for current user management
  - Automatic `user_id` filtering in all `PostgresAdapter` queries
  - User CRUD operations implementation
  - `AuthService` with bcrypt password hashing
  - Session management with encrypted storage
- [x] API Endpoints
  - `/api/auth/*` for login, logout, and status
  - `/api/users/*` for user management (list, create, update, delete)
  - `/api/health` endpoint for status monitoring
- [x] Frontend Implementation
  - `UserSwitcher` dropdown component in header
  - `AuthGuard` route protection
  - Login page (`/login`) with user selector + password
  - User management page (`/users`) for CRUD operations
  - Multi-user mode toggle in settings page
  - Session timeout handling

#### Backend Status Monitoring
- [x] Health check API returning version and status
- [x] Real-time backend version and connection status on home page
- [x] Auto-redirect to home after settings save

---

### v0.2 - Recognition Enhancement
**Released: Apr 2026**

#### Packaged Food Recognition (OCR)
- [x] Specialized recognition mode for packaged foods and drinks
- [x] OCR via AI for nutrition labels and packaging information
- [x] Automatic nutrient extraction from label text

#### Multi-Provider LLM Support
- [x] Google Gemini (Gemini 2.5 Flash, Gemini 3 Flash/Pro)
- [x] Zhipu AI (GLM-4V models)
- [x] OpenAI (GPT-4o, GPT-4o mini)
- [x] OpenAI Compatible: DeepSeek, Qwen-VL, GLM-4V, Doubao, etc.
- [x] Model configuration in settings page

#### Recognition Queue & Guided Retry
- [x] Client-side queue for image recognition tasks
- [x] Multiple photos upload in quick succession
- [x] Asynchronous result handling
- [x] Guided AI retry for failed recognitions

#### Unit Preferences
- [x] Unit conversion (kcal/kJ, g/oz)
- [x] User-configurable unit preferences in settings

#### Regional Adaption
- [x] One-click setup for CN/US regions
- [x] Region-specific nutrition target defaults

---

### v0.1 - Core Foundation
**Released: Early 2026**

#### Smart Food Logging
- [x] Photo-based food logging
- [x] AI dish recognition from images
- [x] Text-based meal entry
- [x] Automatic nutritional breakdown

#### Dashboard & History Tracking
- [x] Daily nutrition stats
- [x] Weekly history view
- [x] Progress tracking over time

#### Backfilling & Meal Classification
- [x] Support for backfilling meals (Breakfast, Lunch, Dinner, Snack)
- [x] Manual entries
- [x] Automatic meal time classification

#### Recipe Library
- [x] Recipe re-entry
- [x] Automatic snapshotting of recipe data

#### Portion Management & Sharing
- [x] Meal sharing with family/friends
- [x] Smart weight scaling
- [x] Portion splitting

#### Database Migration
- [x] Migrated from SQLite to PostgreSQL
- [x] Drizzle ORM integration
- [x] Database adapter pattern for SQLite and PostgreSQL

#### Docker Support
- [x] Docker build with persistent database
- [x] Docker Compose configuration
- [x] Automatic migrations on startup

#### Custom Meal Times
- [x] Configurable meal time windows
- [x] Settings page configuration

---

## Future Roadmap

### Feature Priority Matrix

| Feature | Priority | Effort | Status | Notes |
|---------|----------|--------|--------|-------|
| Device-based Auth (TOTP + Device Approval) | P1 | Medium | ⏳ Planned | Single-user security layer, no password needed |
| Food Calendar | P1 | Low | ⏳ Planned | Natural extension of existing history |
| Dietary Reference Intakes (DRI) | P1 | Medium | ⏳ Planned | Official nutrient recommendations (CN/US/WHO) |
| Health Mode Switch | P1 | Low | ⏳ Planned | UI emphasis on different nutrition metrics |
| Pre/Post Meal Comparison | P2 | Medium | 📋 Architecture Designed | See [comparison_analysis.md](features/comparison_analysis.md) |
| Smart Recipe Recommendation | P2 | Medium-High | ⏳ Planned | LLM-powered dish suggestions based on DRI |
| PWA Support | P2 | Medium | 📋 Planning | Next.js built-in support |
| Calendar Image Sharing | P2 | Medium | 📋 Planning | Frontend generated, no storage needed |
| Biomarker Pattern Analysis | P3 | High | ⏳ Planned | Blood sugar / uric acid / lipid trends |
| Health Risk Assessment | P3 | Very High | ⏳ Planned | Glycemic / vascular / liver-kidney / purine |
| Single-User 2FA | P4 | Low | ⏳ Planned | Part of device-based auth |

---

### Architecture Decision Records

#### ADR 1: Calendar Image Storage - No S3/MinIO

**Decision: Frontend generation + Frontend consumption**

```
User clicks "Share" -> html2canvas generates image -> User saves/shares -> Image discarded
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

#### ADR 2: Device-based Authentication (TOTP + Device Approval)

**Decision: Dual-mode device authorization without passwords**

Single-user mode currently has zero access control. Instead of adding passwords, implement a device-based auth model with two coexisting authorization methods:

**Method A: TOTP 6-digit code**
- User binds an Authenticator app (Google Authenticator / Ente Auth / 1Password)
- New device enters 6-digit TOTP code to get authorized
- Self-service, no other device needed

**Method B: Device approval (Syncthing-style, no push)**
- New device creates a pending request with a short code (e.g. `XK7M`)
- Already-logged-in device sees pending requests on session management page (manual refresh)
- Approve/deny from existing device

Both methods produce a trusted session. User can choose either at login time.

**Flow:**

```
Fresh Install
  └─> Auto-login + guide TOTP binding (optional, can skip)

New Device (No Session)
  ├─> Option A: Enter TOTP 6-digit code ──> Verify ──> Create session ✅
  └─> Option B: Create pending request ──> Show request code ──> Wait for approval
                                                          │
  Existing Device (Session Management Page)
        ├─> See pending request list (manual refresh)
        ├─> Approve ──> New device polls, discovers approval ──> Create session ✅
        └─> Deny ──> New device shows denied
```

**Design points:**
- New device polls `/api/auth/device/status?code=XK7M` every 3s
- Request code: 4-char alphanumeric, easy to read
- Pending requests expire after 10 minutes
- If TOTP not bound: login page only shows device approval option
- If both bound: login page shows both options, user chooses
- Trusted sessions are long-lived (30/90 days)
- Backup codes generated at TOTP setup time for recovery

**Database Schema:**

```sql
-- Device authorization requests
device_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_code TEXT NOT NULL,         -- e.g. 'XK7M'
  device_name TEXT,                   -- browser UA or user-defined
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | denied | expired
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
)

-- Active sessions (device-level management)
sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT,
  fingerprint TEXT NOT NULL,          -- UUID generated in localStorage
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
)
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/totp/setup` | POST | Generate TOTP secret + QR code |
| `/api/auth/totp/verify` | POST | Verify 6-digit code, create session |
| `/api/auth/device/request` | POST | Create pending request, return request code |
| `/api/auth/device/status` | GET | Poll request status (new device) |
| `/api/auth/device/list` | GET | List pending requests + active sessions |
| `/api/auth/device/approve` | POST | Approve a pending request |
| `/api/auth/device/deny` | POST | Deny a pending request |
| `/api/auth/device/revoke` | POST | Revoke an active session |

**Relationship with existing auth:**
- Current cookie-based session in [session.ts](../lib/auth/session.ts) remains as session carrier
- `sessions` table adds device-level management (revoke, view active devices)
- Changes are isolated to auth layer, no business logic impact
- Can coexist with multi-user password mode:
  - Single-user + TOTP: one user, device-level authorization
  - Multi-user + password + TOTP: each user logs in with password, optional 2FA via TOTP

**Dependencies:**
- `otplib` - TOTP generation/verification (RFC 6238)
- `qrcode` - QR code generation for TOTP binding

---

### Implementation Roadmap

#### Phase 1: High Value, Low Effort

##### Device-based Auth (TOTP + Device Approval)
- [ ] Add `otplib` + `qrcode` dependencies
- [ ] Schema: `device_requests` + `sessions` tables (PostgreSQL + SQLite)
- [ ] Settings: `totp_secret`, `totp_backup_codes` in settings table
- [ ] API: TOTP setup + verify endpoints
- [ ] API: Device request + status + list + approve/deny/revoke endpoints
- [ ] Update [session.ts](../lib/auth/session.ts) to track device fingerprint
- [ ] Update [auth-guard.tsx](../components/auth-guard.tsx) to redirect to TOTP/device-approval login
- [ ] Frontend: TOTP input page (6-digit code)
- [ ] Frontend: Device approval request page (show request code + polling)
- [ ] Frontend: Session management page in settings (active devices + pending requests + refresh)
- [ ] Frontend: TOTP binding guide page (QR code + backup codes)
- [ ] i18n: Auth-related translations

##### Food Calendar
- [ ] API: `/api/nutrition/calendar` - return monthly dish summaries + nutrition totals
- [ ] Frontend: `app/calendar/page.tsx` - month view grid component
  - [ ] Daily cell showing total calories + achievement color
  - [ ] Click date to expand dish list
  - [ ] Month navigation (prev/next)
- [ ] Frontend: Add "Calendar View" entry button on home page
- [ ] i18n: Calendar translations

##### Dietary Reference Intakes (DRI)
- [ ] Data: `lib/nutrition/dri-standards.ts` - built-in reference values
  - [ ] Chinese DRIs (中国营养学会)
  - [ ] US DRI (NIH/FNB)
  - [ ] WHO recommendations (optional)
- [ ] Types: Extend `DailyTargets` with micronutrients (sodium, potassium, calcium, iron, zinc, phosphorus, fiber, cholesterol, sugar, purine, vitamins)
- [ ] Logic: Extend [nutrition-calc.ts](../lib/nutrition-calc.ts) to calculate full nutrient targets
- [ ] Schema: Add micronutrient columns to `dishes` + `recipes` tables
- [ ] API: Extend `/api/settings` to return full DRI targets
- [ ] LLM: Extend [dish-init-prompt.txt](../prompts/dish-init-prompt.txt) to recognize additional nutrients
- [ ] Frontend: DRI standard selector + full nutrient target display in settings
- [ ] Frontend: Dashboard supports switching displayed nutrients
- [ ] Migration: Backfill existing recipe/dish data with new nutrient fields

##### Health Mode Switch
- [ ] `health_focus` setting: general | glycemic | lipid | purine
- [ ] UI highlights corresponding nutrition metrics

---

#### Phase 2: Medium Effort

##### Pre/Post Meal Comparison
> Architecture already designed, see [comparison_analysis.md](features/comparison_analysis.md)

- [ ] Phase 1 - Data layer: `measurements` + `meal_comparisons` tables, type definitions, adapter implementation
- [ ] Phase 2 - Analysis service: `ComparisonService` + `NutritionAnalyzer`
- [ ] Phase 3 - API: `/api/comparison/daily/[date]`, `/api/comparison/meal/[entryId]`, `/api/comparison/measurements`
- [ ] Phase 4 - UI: `ComparisonCard` component, comparison analysis page, detail page
- [ ] Phase 5 - Integration: Homepage comparison summary card, auto-association of measurements to meals

##### Smart Recipe Recommendation
- [ ] Schema: Add category/tag fields to `recipes` table (cuisine, ingredient type, suitable groups)
- [ ] Prompt: `prompts/recipe-recommend-prompt.txt` - input: daily progress + remaining targets + preferences + recipe library; output: recommended dishes with nutrition estimates
- [ ] API: `/api/recommendations` - receive context, call LLM, return recommendations
- [ ] Frontend: "Today's Recommendation" card on home/calendar page
  - [ ] Show recommended dishes + nutrition estimates
  - [ ] One-click add to daily record
  - [ ] "Refresh" for new recommendations
  - [ ] Preference settings (allergies, cuisine preferences)
- [ ] i18n: Recommendation translations
- [ ] **Depends on: DRI** - needs full nutrient targets as recommendation basis

##### PWA Support
- [ ] `public/manifest.json` configuration
- [ ] Enable PWA in `next.config.ts`
- [ ] Service Worker for offline data caching strategy

##### Calendar Image Sharing
- [ ] `html2canvas` integration
- [ ] `ShareButton` component
- [ ] WeChat Moments support (1080x1920)
- [ ] Watermark and branding

---

#### Phase 3: Health Risk & Pattern Analysis (Long-term)

##### Biomarker Pattern Analysis
- [ ] Data layer: Reuse `measurements` table from Pre/Post Comparison, extend metric types
  - Blood glucose (fasting / post-meal / random)
  - Uric acid
  - Lipids (total cholesterol / LDL / HDL / triglycerides)
- [ ] API: `/api/health/metrics` CRUD endpoints (manual entry, query by type + time range)
- [ ] Analysis engine: `lib/health/pattern-analyzer.ts`
  - [ ] Time series trend analysis (rising / falling / stable)
  - [ ] Diet-metric correlation analysis (e.g. "uric acid spikes after high-purine meals")
  - [ ] Anomaly detection and alerts
- [ ] LLM insights: New prompt for diet-metric correlation, generate natural language reports
- [ ] Frontend: `app/health/page.tsx`
  - [ ] Metric input form
  - [ ] Time series trend chart (with diet event overlays)
  - [ ] LLM insight cards
  - [ ] Anomaly warning prompts
- [ ] **Depends on: Pre/Post Comparison** - reuses measurements table
- [ ] Enhanced by: DRI - carb quality / GI data for glucose pattern analysis

##### Health Risk Assessment
- [ ] Risk models: `lib/health/risk-models/` - 4 independent scoring models
  - [ ] `glycemic-risk.ts` - Blood sugar risk (carb quality, sugar, fiber, GI)
  - [ ] `vascular-risk.ts` - Vascular pressure (sodium, saturated fat, cholesterol, trans fat)
  - [ ] `liver-kidney-risk.ts` - Liver/kidney burden (protein excess, sodium, phosphorus, purine)
  - [ ] `purine-risk.ts` - Purine storm (purine total, high-purine food ratio)
- [ ] API: `/api/health/risk-assessment` - daily/weekly risk scores + contributing factors
- [ ] Frontend: `app/health/risk/page.tsx`
  - [ ] 4 risk gauge components (gauge + color warning)
  - [ ] Daily risk score trend chart
  - [ ] Contributing factor breakdown (which foods raised risk)
  - [ ] Disclaimer: "For reference only, does not constitute medical diagnosis"
- [ ] Data source: Purine content database
  - [ ] Curated purine content reference table for common Chinese dishes
  - [ ] Or external food database API integration
- [ ] **Depends on: DRI** - needs extended micronutrient data
- [ ] **Depends on: Biomarker Pattern Analysis** - risk scores can be validated against actual biomarkers

---

### Dependency Graph

```
Device-based Auth ──────────────────────────────> Independent

Food Calendar ──────────────────────────────────> Independent

DRI ──────────────────┬────────────────────────> Independent
                       │
                       ├──> Smart Recipe Recommendation
                       │
                       └──> Health Risk Assessment

Pre/Post Comparison ──┬────────────────────────> Independent (architecture designed)
                       │
                       └──> Biomarker Pattern Analysis
                                │
                                └──> Health Risk Assessment
```

### Suggested Development Order

1. **Device-based Auth** - Security foundation, isolated from business logic
2. **Food Calendar** - Highest ROI, zero schema changes
3. **DRI** - Foundation for Smart Recipe Recommendation + Health Risk Assessment
4. **Health Mode Switch** - Quick win, UI-only
5. **Pre/Post Meal Comparison** - Architecture already designed, ready to implement
6. **Smart Recipe Recommendation** - High product value, depends on DRI
7. **PWA Support** - Independent, improves mobile experience
8. **Calendar Image Sharing** - Builds on Food Calendar
9. **Biomarker Pattern Analysis** - Depends on Pre/Post Comparison
10. **Health Risk Assessment** - Most complex, depends on DRI + Biomarker, do last

---

### Code Organization Plan

```
lib/
├── auth/
│   ├── totp.ts                    ← Phase 1 (TOTP generation/verification)
│   ├── device-auth.ts             ← Phase 1 (Device request/approval flow)
│   └── session.ts                 ← Update (device tracking)
├── nutrition/
│   └── dri-standards.ts           ← Phase 1 (DRI reference data)
├── comparison/                    ← Phase 2 (Pre/Post meal)
│   ├── service.ts
│   └── analyzers/
│       ├── nutrition.ts
│       └── blood-glucose.ts
├── health/                        ← Phase 3 (Risk assessment)
│   ├── pattern-analyzer.ts
│   ├── risk-models/
│   │   ├── glycemic-risk.ts
│   │   ├── vascular-risk.ts
│   │   ├── liver-kidney-risk.ts
│   │   └── purine-risk.ts
│   └── insights.ts                ← LLM insight generation
└── recommendations/               ← Phase 2 (Smart recipe)
    └── recipe-recommender.ts

components/
├── auth/
│   ├── TotpInput.tsx              ← Phase 1
│   ├── DeviceApprovalPage.tsx     ← Phase 1
│   └── SessionManager.tsx         ← Phase 1
├── calendar/                      ← Phase 1
│   ├── CalendarGrid.tsx
│   ├── DayCell.tsx
│   └── ShareButton.tsx            ← Phase 2
├── comparison/                    ← Phase 2
│   ├── ComparisonCard.tsx
│   └── MetricComparisonItem.tsx
├── health/                        ← Phase 3
│   ├── RiskGauge.tsx
│   ├── PatternChart.tsx
│   └── ReportCard.tsx
└── recommendations/               ← Phase 2
    └── RecommendationCard.tsx
```

---

### Important Notes

#### Health Risk Features
- **Must** add explicit disclaimer: "This assessment is for reference only, does not constitute medical diagnosis"
- Recommend citing authoritative sources (WHO, Chinese Nutrition Society, etc.)
- Avoid medical terms like "diagnosis", "treatment"; use "risk indication", "reference advice" instead

#### Device Auth Notes
- TOTP secret must be stored securely in settings table
- Backup codes are one-time use, should be hashed
- Session fingerprint stored in localStorage (not cookie) to survive cookie clears
- If user loses both authenticator device and backup codes, recovery requires DB access

#### DRI Data Accuracy
- LLM estimation of micronutrients (especially purine) has uncertain accuracy
- May need supplementary local food database for critical nutrients
- Existing data backfill requires re-recognition or manual supplement

#### Data Migration
- Set default values when adding `user_id` columns to avoid orphaned existing data
- Need data ownership strategy when migrating to real users in future

---

### Open Discussion Items

- [ ] Data source selection for health risk assessment (open source vs paid API)
- [ ] PWA offline caching strategy (which data needs offline availability)
- [ ] Purine content database: self-curated vs external API
- [ ] TOTP recovery flow: what if user loses authenticator + backup codes?
- [ ] Recipe recommendation cold start: rely on LLM knowledge vs require minimum recipe library size
