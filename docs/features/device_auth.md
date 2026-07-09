# Device-based Authentication

> ✅ **Implementation Status: Completed & Stable**

YuHeng supports device-level authentication for single-user mode, providing TOTP (2FA) and device approval flows without requiring passwords. This ensures that only trusted devices can access the application.

## Core Principle

**Device Auth = TOTP.** They are a single unit — there is no state where device auth is enabled but TOTP is disabled. Enabling device auth requires initializing TOTP; disabling requires a valid TOTP code.

## Implementation Summary

**What's implemented:**
- ✓ TOTP (2FA) generation and verification using `otplib` (RFC 6238)
- ✓ Device approval flow (request → approve → session)
- ✓ DB-backed trusted sessions (non-expiring, remotely revocable)
- ✓ Device fingerprinting via `crypto.randomUUID()` stored in `localStorage`
- ✓ Login page with TOTP and device approval tabs
- ✓ Settings page with unified device auth toggle and TOTP management
- ✓ Session manager with "It's me" indicator and revocation
- ✓ PostgreSQL + SQLite dual adapter support

---

## Enable/Disable Flow

### Enabling Device Auth (First Time)

The enable flow is a two-step process to ensure TOTP is properly configured before device auth is activated:

1. **User toggles device auth ON** in Settings
2. `POST /api/auth/device/enable` — no session required (device auth is off)
   - Generates TOTP secret, QR code, and backup codes (not yet saved)
   - Returns setup data to frontend
3. **User scans QR code** and enters a 6-digit verification code
4. `POST /api/auth/totp/confirm` — no session required (device auth is still off)
   - Verifies the TOTP code
   - Saves TOTP secret + hashed backup codes to database
   - Sets `device_auth_enabled = true`
   - Creates a trusted session for the current device
   - User stays logged in (no re-login required)

If the user cancels before confirming, nothing is persisted — the database remains unchanged.

### Disabling Device Auth

Disabling requires a valid TOTP code to prevent accidental lockout:

1. **User toggles device auth OFF** in Settings
2. Dialog prompts for TOTP code
3. `POST /api/auth/device/disable` — requires session + TOTP code
   - Verifies TOTP code
   - Sets `device_auth_enabled = false`
   - Clears TOTP secret and backup codes
   - Revokes all sessions

### Changing TOTP

After device auth is enabled, the user can regenerate TOTP (e.g., lost phone):

1. **User clicks "Change TOTP"** in Settings
2. `POST /api/auth/totp/setup` — requires session (device auth is on)
   - Generates new TOTP secret + QR code + backup codes
3. **User scans and verifies**
4. `POST /api/auth/totp/confirm` — requires session
   - Replaces old TOTP secret with new one

---

## Data Model

### `device_requests` — Device Approval Requests

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment primary key |
| user_id | UUID FK | Associated user (default DEFAULT_USER_ID) |
| request_code | TEXT | 4-char internal identifier (not shown to users) |
| device_name | TEXT | Device name (optional, user-provided) |
| status | TEXT | pending / approved / denied / expired |
| created_at | TIMESTAMP | Creation time |
| resolved_at | TIMESTAMP | Resolution time |

### `sessions` — Trusted Device Sessions

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Auto-increment primary key |
| user_id | UUID FK | Associated user |
| device_name | TEXT | Device name |
| fingerprint | TEXT | Device fingerprint (UUID, generated in localStorage) |
| created_at | TIMESTAMP | Creation time |
| last_active_at | TIMESTAMP | Last active time |
| expires_at | TIMESTAMP | Expiry (set to 2099-12-31, never expires) |

Migration files:
- PG: `drizzle/pg/0001_device_auth.sql`
- SQLite: `drizzle/sqlite/0001_device_auth.sql`

---

## API Endpoints

```typescript
// TOTP
POST   /api/auth/totp/setup      Generate TOTP secret + QR + backup codes (requires session when auth is on)
POST   /api/auth/totp/confirm    Verify code and bind TOTP (no session needed for first-time enable)
POST   /api/auth/totp/verify     TOTP login verification (no session, for new devices)
POST   /api/auth/totp/disable    Disable TOTP (requires session + TOTP code)

// Device Auth
POST   /api/auth/device/enable   Enable device auth — returns TOTP setup data (no session needed when auth is off)
POST   /api/auth/device/disable  Disable device auth (requires session + TOTP code)
POST   /api/auth/device/request  Create approval request (no session, for new devices)
GET    /api/auth/device/status   Poll request status (?requestId=N)
GET    /api/auth/device/list     List pending requests + active sessions (requires session)
POST   /api/auth/device/approve  Approve a pending request (requires session)
POST   /api/auth/device/deny     Deny a pending request (requires session)
POST   /api/auth/device/session  Create session after approval (no session, for new devices)
POST   /api/auth/device/revoke   Revoke an active session (requires session, cannot revoke current)
```

---

## Architecture

### Auth Library

**`lib/auth/totp.ts`** — TOTP Service
- `generateSecret()` — Generate Base32 secret
- `buildOtpAuthUri(secret, label)` — Generate `otpauth://` URI
- `generateQrCode(uri)` — Generate QR code data URL
- `verify(secret, token)` — Async TOTP verification (2-min window)
- `generateBackupCodes()` — Generate 8 backup codes (8 chars each)
- `hashBackupCodes(codes)` — bcrypt hash for storage
- `verifyBackupCode(code, hashes)` — Verify and consume backup code

**`lib/auth/device-auth.ts`** — Device Approval Service
- `createRequest(deviceName)` — Create pending request, return requestId
- `getRequestStatusById(requestId)` — Poll request status
- `approveRequest(requestId)` / `denyRequest(requestId)` — Resolve requests
- `createSessionFromApproval(requestId, fingerprint, deviceName)` — Create session after approval
- `createTrustedSession(fingerprint, deviceName)` — Create session after TOTP login
- `listSessions()` / `revokeSession(id)` — Session management

**`lib/auth/session.ts`** — Session Management (updated)
- `createDeviceSession()` — Create DB-backed long-term session cookie (10-year maxAge)
- `get()` — If session has `sessionId`, validates against DB (supports remote revocation)
- `isExpired()` — Device sessions never expire; multi-user sessions expire in 1 day
- `getDeviceFingerprint()` — Read fingerprint from `X-Device-FP` header or cookie

**`lib/auth/auth-service.ts`** — Auth Service (extended)
- `enableDeviceAuth()` — Relaxed session check (single-user mode + auth off), generates TOTP setup data
- `confirmTotpSetup()` — No session required when enabling for the first time; verifies code, saves TOTP, enables device auth, creates trusted session
- `disableDeviceAuth(token)` / `disableTotp(token)` — Require valid TOTP code
- `verifyTotpLogin(token, fingerprint, deviceName)` — TOTP verification + session creation

### Frontend

**`app/login/page.tsx`** — Login Page (rewritten)
- Multi-user mode: user selector + password login (unchanged)
- Device auth mode:
  - TOTP tab: 6-digit code input (supports backup codes)
  - Device Approval tab: submit request → "Waiting for approval..." polling UI
  - Polls status every 3 seconds via requestId

**`components/auth/totp-setup.tsx`** — TOTP Setup Component
- Displays QR code for Authenticator app scanning
- Shows secret key for manual entry
- Shows 8 backup codes (copyable)
- 6-digit verification code input
- Supports `initialData` prop to skip setup API call (used during first-time enable)

**`components/auth/session-manager.tsx`** — Session Manager
- Pending request list (device name + request time, ✓ approve / ✗ deny)
- Active session list (device name + last active time, 🗑 revoke)
- Current device session shows "It's me" badge and cannot be revoked
- Does not show request codes or expiry times

**`lib/auth/auth-context.tsx`** — Auth Context (extended)
- 15+ device auth related methods
- Client generates device fingerprint (`crypto.randomUUID()`), stored in localStorage
- Key API calls include `X-Device-FP` header

**`components/auth-guard.tsx`** — Route Guard (updated)
- Supports `deviceAuthEnabled` mode
- Redirects to `/login` when device auth is on and user is unauthenticated

**`app/settings/page.tsx`** — Settings Page (updated)
- Single device auth toggle (device auth = TOTP, unified)
- Toggle ON: shows TOTP initialization wizard (scan + verify), enables after confirm
- Toggle OFF: TOTP verification dialog required
- TOTP bound: shows "Change TOTP" only (no separate "Disable TOTP")
- Embeds SessionManager component

---

## Login Flow for New Devices

When device auth is enabled and a new (untrusted) device accesses the app:

### Option A: TOTP Login
1. New device opens the app → redirected to `/login`
2. User enters a 6-digit TOTP code (or backup code)
3. `POST /api/auth/totp/verify` — verifies code, creates trusted session
4. Device is now trusted (non-expiring session)

### Option B: Device Approval
1. New device opens the app → redirected to `/login`
2. User switches to "Device Approval" tab, enters device name, submits
3. `POST /api/auth/device/request` — creates pending request
4. New device shows "Waiting for approval..." and polls every 3s
5. On a trusted device: Settings → Session Manager → approve the request
6. Once approved, new device calls `POST /api/auth/device/session` to create a session
7. Device is now trusted

---

## Dependencies

- `otplib` v13 — TOTP generation/verification (RFC 6238)
- `qrcode` — QR code generation
- `bcryptjs` — Backup code hashing (existing dependency)
- `@types/qrcode` — Type definitions

---

## Testing

`scripts/test-device-auth.ts` — End-to-end device approval flow test:

1. Create device request → verify pending
2. Poll status → verify pending
3. List pending → verify request in list
4. Approve request → verify approved
5. Create session → verify session created
6. List sessions → verify session exists
7. Re-approve → verify failure
8. Create second request and deny → verify denied
9. Create session from denied → verify failure
10. Revoke session → verify session deleted
11. Approve non-existent request → verify failure

Run with: `npx tsx scripts/test-device-auth.ts` (requires a working database connection; Bun does not support `better-sqlite3`)

---

## Differences from Original Design

| Original Design | Implementation | Reason |
|----------------|----------------|--------|
| Request code shown to user, typed on trusted device | Request code is internal; requests appear directly in Settings UI | Simpler UX |
| Trusted sessions expire in 30/90 days | Trusted sessions never expire (2099-12-31) | User preference |
| Polling via requestCode | Polling via requestId | More direct without exposing codes |
| `getDeviceRequestByCode` query | `getDeviceRequest(id)` query | Simplified query logic |
| `expires_at > NOW()` filter | No expiry filter | Sessions never expire |
| Fingerprint in localStorage only | Fingerprint in localStorage, passed via header, stored in session cookie | SSR-compatible |
| Separate TOTP and device auth toggles | Single unified toggle (device auth = TOTP) | Design principle: they are one unit |
| Enable device auth directly | Two-step: enable returns TOTP setup → confirm activates | Prevents partial/broken state |
| Disable with session only | Disable requires TOTP code | Prevents accidental lockout |
