# YuHeng Release History

## v0.3 - Current (Multi-User & Status)
**Released: May 2026**

### Multi-User Support
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

### Backend Status Monitoring
- [x] Health check API returning version and status
- [x] Real-time backend version and connection status on home page
- [x] Auto-redirect to home after settings save

---

## v0.2 - Recognition Enhancement
**Released: Apr 2026**

### Packaged Food Recognition (OCR)
- [x] Specialized recognition mode for packaged foods and drinks
- [x] OCR via AI for nutrition labels and packaging information
- [x] Automatic nutrient extraction from label text

### Multi-Provider LLM Support
- [x] Google Gemini (Gemini 2.5 Flash, Gemini 3 Flash/Pro)
- [x] Zhipu AI (GLM-4V models)
- [x] OpenAI (GPT-4o, GPT-4o mini)
- [x] OpenAI Compatible: DeepSeek, Qwen-VL, GLM-4V, Doubao, etc.
- [x] Model configuration in settings page

### Recognition Queue & Guided Retry
- [x] Client-side queue for image recognition tasks
- [x] Multiple photos upload in quick succession
- [x] Asynchronous result handling
- [x] Guided AI retry for failed recognitions

### Unit Preferences
- [x] Unit conversion (kcal/kJ, g/oz)
- [x] User-configurable unit preferences in settings

### Regional Adaption
- [x] One-click setup for CN/US regions
- [x] Region-specific nutrition target defaults

---

## v0.1 - Core Foundation
**Released: Early 2026**

### Smart Food Logging
- [x] Photo-based food logging
- [x] AI dish recognition from images
- [x] Text-based meal entry
- [x] Automatic nutritional breakdown

### Dashboard & History Tracking
- [x] Daily nutrition stats
- [x] Weekly history view
- [x] Progress tracking over time

### Backfilling & Meal Classification
- [x] Support for backfilling meals (Breakfast, Lunch, Dinner, Snack)
- [x] Manual entries
- [x] Automatic meal time classification

### Recipe Library
- [x] Recipe re-entry
- [x] Automatic snapshotting of recipe data

### Portion Management & Sharing
- [x] Meal sharing with family/friends
- [x] Smart weight scaling
- [x] Portion splitting

### Database Migration
- [x] Migrated from SQLite to PostgreSQL
- [x] Drizzle ORM integration
- [x] Database adapter pattern for SQLite and PostgreSQL

### Docker Support
- [x] Docker build with persistent database
- [x] Docker Compose configuration
- [x] Automatic migrations on startup

### Custom Meal Times
- [x] Configurable meal time windows
- [x] Settings page configuration
