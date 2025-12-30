# Backend Status and Settings Redirect

Implemented real-time backend status monitoring and improved the settings page user experience.

## Features

### Backend Health Check
- Created `/api/health` endpoint to provide a status heartbeat and application version.
- Updated `api-client.ts` with `checkHealth` method.

### Real-time Version & Status Indicator
- Created `BackendStatus` component:
  - Displays the application version (e.g., `v0.1.0`) fetched from `package.json`.
  - Indicates server status with a compact pulsing dot (Green for Online, Red for Offline).
  - Integrated into the `HomePage` layout, positioned directly under the logo.

### Settings UX Improvement
- Updated `SettingsPage`:
  - Automatically redirects to the Home Page after successfully saving settings.

## Implementation Details

### API Endpoint
The health check endpoint is located at `app/api/health/route.ts`. It returns the current version from `package.json`.

### Frontend Component
The `BackendStatus` component (`components/backend-status.tsx`) handles the polling logic (every 30 seconds) and UI state.

### Settings Page Logic
The save handler in `app/settings/page.tsx` was modified to use `router.push('/')` upon success.
