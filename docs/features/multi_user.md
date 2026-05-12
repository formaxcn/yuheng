# Multi-User Support

> ✅ **Implementation Status: **Completed & Stable**

YuHeng supports multiple user profiles on the same device, ideal for family or shared household use. Each user has their own isolated data, settings, and nutritional targets.

## Implementation Summary

**What's implemented:
- ✓ Complete database schema with `users` table and `user_id` foreign keys on all tables
- ✓ `UserContext` class with automatic user filtering in all queries
- ✓ Password authentication using bcrypt
- ✓ Session management with encrypted localStorage
- ✓ Login page with user selector
- ✓ User management page (create/edit/delete users)
- ✓ User switcher dropdown in header
- ✓ Auth guard for route protection
- ✓ Multi-user mode toggle in settings (defaults to single-user mode)
- ✓ Complete data isolation between users with ON DELETE CASCADE

## Core Principles

### Local-First, Password Authentication
- Single-user mode by default (no login required)
- Multi-user mode requires password authentication per profile
- Password hashing using bcrypt, stored locally
- Architecture ready for future SSO integration (OAuth, OIDC)
- All data remains local to the device

### Complete Data Isolation
Each user's data is fully separated:
- Food entries and history
- Recipe library
- Settings and nutritional targets
- Recognition task history

### Profile Management
- Create unlimited user profiles
- Switch profiles in 1 click
- Delete profiles (with confirmation)
- Export/import individual profile data

---

## Data Model

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,               -- for future SSO
    password_hash TEXT,              -- bcrypt hash (required in multi-user mode)
    avatar TEXT,                     -- emoji or color
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'user',        -- user, admin (for future SSO)
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    sso_provider TEXT,               -- oauth, oidc, etc. (future)
    sso_id TEXT                      -- external user ID (future)
);

-- Default system user for migration (no password - single-user mode)
INSERT INTO users (id, name, is_default) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default', true);
```

### Multi-User Mode Toggle
Global setting controls behavior:
```sql
-- When enabled: show login screen, require password
INSERT INTO settings (key, value) 
VALUES ('multi_user_enabled', 'false');
```

**Single-User Mode (default)**:
- No login screen
- Always uses default user `00000000-0000-0000-0000-000000000000`
- No authentication required
- User management UI hidden

**Multi-User Mode**:
- Login screen on app launch
- Require password for profile switching
- User management UI visible
- Default user must set password to continue using

### Schema Changes for All Tables
Add `user_id` column with foreign key constraint:

```sql
-- recipes
ALTER TABLE recipes ADD COLUMN user_id UUID 
    DEFAULT '00000000-0000-0000-0000-000000000000' 
    REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- entries
ALTER TABLE entries ADD COLUMN user_id UUID 
    DEFAULT '00000000-0000-0000-0000-000000000000' 
    REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_entries_user_id ON entries(user_id);

-- dishes
ALTER TABLE dishes ADD COLUMN user_id UUID 
    DEFAULT '00000000-0000-0000-0000-000000000000' 
    REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_dishes_user_id ON dishes(user_id);

-- settings (composite primary key)
ALTER TABLE settings RENAME TO settings_old;
CREATE TABLE settings (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, key)
);
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- migration: copy old settings to default user
INSERT INTO settings (user_id, key, value)
SELECT '00000000-0000-0000-0000-000000000000', key, value 
FROM settings_old;
DROP TABLE settings_old;

-- recognition_tasks
ALTER TABLE recognition_tasks ADD COLUMN user_id UUID 
    DEFAULT '00000000-0000-0000-0000-000000000000' 
    REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_recognition_tasks_user_id ON recognition_tasks(user_id);
```

---

## Architecture

### User Context Layer
```typescript
// lib/db/user-context.ts
export class UserContext {
    private static currentUserId: string = '00000000-0000-0000-0000-000000000000';
    
    static set(userId: string): void {
        this.currentUserId = userId;
    }
    
    static get(): string {
        return this.currentUserId;
    }
    
    static isDefault(): boolean {
        return this.currentUserId === '00000000-0000-0000-0000-000000000000';
    }
}
```

### Database Adapter Integration
All queries automatically filter by `user_id`:

```typescript
// All queries include user_id filter
async getRecipe(name: string): Promise<Recipe | undefined> {
    const rows = await this.sql`
        SELECT * FROM recipes 
        WHERE name = ${name} 
        AND user_id = ${UserContext.get()}
    `;
    return rows[0] as Recipe | undefined;
}

async createRecipe(recipe: Omit<Recipe, 'id' | 'created_at'>): Promise<Recipe> {
    const rows = await this.sql`
        INSERT INTO recipes (name, energy, ..., user_id)
        VALUES (${recipe.name}, ..., ${UserContext.get()})
        RETURNING id
    `;
    return { ...recipe, id: rows[0].id } as Recipe;
}
```

### Settings Per User
Settings become user-scoped with fallback to global defaults:

```typescript
async getSetting(key: string): Promise<string | undefined> {
    // First try user-specific
    const rows = await this.sql`
        SELECT value FROM settings 
        WHERE key = ${key} 
        AND user_id = ${UserContext.get()}
    `;
    if (rows.length > 0) return rows[0].value;
    
    // Fallback to default user (global defaults)
    const fallback = await this.sql`
        SELECT value FROM settings 
        WHERE key = ${key} 
        AND user_id = '00000000-0000-0000-0000-000000000000'
    `;
    return fallback[0]?.value;
}
```

---

## Frontend Integration

### User Switcher Component
```
┌─────────────────────────────────┐
│ 👤 Alice  ▼                     │  ← Header dropdown
├─────────────────────────────────┤
│ 👤 Alice  ✓                     │
│ 👤 Bob                          │
│ 👤 Charlie                      │
│ ──────────────────────────────  │
│ ➕ Add Profile                  │
│ ⚙️ Manage Profiles              │
└─────────────────────────────────┘
```

### Profile Management Page
- **User List**: Show all profiles with avatars
- **Create Profile**: Name + Avatar (emoji/color) + Optional PIN
- **Edit Profile**: Change name/avatar/PIN
- **Delete Profile**: Confirmation + Data deletion warning
- **Export/Import**: JSON backup per user

### Session Management

**Authentication Flow**:
```typescript
// lib/auth/auth.ts
export class AuthService {
    static async login(userId: string, password: string): Promise<boolean> {
        const user = await db.getUser(userId);
        if (!user?.password_hash) return false;
        return bcrypt.compare(password, user.password_hash);
    }
    
    static async setPassword(userId: string, password: string): Promise<void> {
        const hash = await bcrypt.hash(password, 12);
        await db.updateUser(userId, { password_hash: hash });
    }
    
    static async enableMultiUserMode(adminPassword: string): Promise<void> {
        // 1. Set password for default user
        await this.setPassword(DEFAULT_USER_ID, adminPassword);
        // 2. Toggle multi-user mode setting
        await db.saveSetting('multi_user_enabled', 'true');
    }
}
```

**Session State**:
- Current user ID stored in encrypted `localStorage` session
- Session expires after configurable timeout (default: 24h)
- On app load: verify session validity
- On switch: clear dashboard state, reload data
- In multi-user mode: always show login on fresh launch

**Enabling Multi-User Mode**:
1. User goes to Settings → Enable Multi-User
2. Prompt to create admin password for default user
3. Migrate existing data to default user
4. Show login screen on next app load

---

## Migration Strategy

### Phase 1: Schema Migration (Backward Compatible)
1. Add `user_id` columns with default value to all tables
2. Create `users` table and insert default user
3. Migrate settings to composite key
4. Existing data automatically belongs to default user

### Phase 2: DB Layer Integration
1. Add `UserContext` class
2. Update all queries to filter/insert `user_id`
3. No behavior change yet - always uses default user

### Phase 3: Frontend UI
1. User Switcher component in header
2. Profile management page
3. User CRUD API endpoints

### Phase 4: Optional Features
- PIN protection for profiles
- Data sharing between profiles (copy recipes)
- Family view (aggregate statistics)

---

## API Endpoints

```typescript
// Authentication
POST   /api/auth/login          Login with user ID + password
POST   /api/auth/logout         Clear session
POST   /api/auth/enable         Enable multi-user mode (set admin password)
POST   /api/auth/disable        Disable multi-user mode (admin only)
GET    /api/auth/status         Get auth mode and current session

// User management
GET    /api/users               List all users (name, avatar only)
POST   /api/users               Create user (admin only)
PATCH  /api/users/:id           Update user (admin or self)
DELETE /api/users/:id           Delete user (admin only)
POST   /api/users/:id/password  Set/change password (admin or self)

// Session
GET    /api/users/me            Get current user profile
```

---

## Edge Cases & Considerations

### Default User
- The `00000000-0000-0000-0000-000000000000` user cannot be deleted
- It holds all pre-migration data
- New installations can hide it after first real user is created

### Data Deletion
- `ON DELETE CASCADE` ensures all user data is removed when user is deleted
- Frontend confirmation: "This will delete ALL data for this user"

### Recipe Sharing
- Users can copy recipes from other users (creates duplicate in their own library)
- No cross-user recipe references - each user owns their copies

### Future: Family Mode
- For Phase 4: shared family recipe library visible to all users
- Mark recipes as `is_shared: true` with `user_id IS NULL` for global recipes

---

## SSO Readiness

Current architecture supports future SSO integration:
- `email` field for user identification
- `sso_provider` and `sso_id` fields for external auth
- Standard password hashing (bcrypt) compatible with most auth systems
- Role-based access control (`role` field) ready for admin/user separation
- Session management can be replaced with JWT/OAuth tokens

**Future SSO Integration Path**:
1. Add OAuth provider config (Google, Apple, etc.)
2. Create callback endpoints for each provider
3. Link SSO identities to existing local users
4. Optional: Migrate local password accounts to SSO

---

## Implementation Checklist

### Phase 1: Database Schema ✅
- [x] Create `users` table migration
- [x] Add `user_id` column to `recipes`, `entries`, `dishes`, `recognition_tasks`
- [x] Migrate `settings` to composite primary key `(user_id, key)`
- [x] Add indexes on all `user_id` columns
- [x] Add `multi_user_enabled` global setting (default: `false`)
- [x] Insert default system user

### Phase 2: Backend Core ✅
- [x] Create `UserContext` class for current user tracking
- [x] Update `IDatabaseAdapter` interface with user management methods
- [x] Update all queries in `PostgresAdapter` with `user_id` filter
- [x] Implement user CRUD operations in adapter
- [x] Add `bcrypt` for password hashing
- [x] Create `AuthService` class for login/password management

### Phase 3: API Endpoints ✅
- [x] `/api/auth/*` endpoints (login, logout, enable/disable multi-user)
- [x] `/api/users/*` CRUD endpoints
- [x] Session middleware with encrypted cookies
- [x] Input validation and error handling

### Phase 4: Frontend - Single-User Mode (Default) ✅
- [x] No visible changes to existing UI
- [x] `UserContext` always uses default user
- [x] All existing functionality continues working

### Phase 5: Frontend - Multi-User Mode ✅
- [x] Login page (user selector + password input)
- [x] User Switcher dropdown in header
- [x] Profile management page (create/edit/delete users)
- [x] Password change form
- [x] Enable Multi-User toggle in Settings
- [x] Session expiry handling

### Phase 6: Testing & Migration ✅
- [x] Test migration script on existing database
- [x] Verify data isolation between users
- [x] Test delete user cascade behavior
- [x] Test enabling/disabling multi-user mode
- [x] Test password change and login flows
- [x] Test session timeout and auto-logout
