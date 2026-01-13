# Resumable Upload System

To handle large image uploads on unstable mobile networks (especially iPhone lock-screen disconnections), YuHeng implements a highly robust, chunked, and resumable upload system based on the [Tus protocol](https://tus.io/).

## Core Components

### 1. Server-side (Tus Protocol Implementation)
The backend implements a custom Tus-compatible handler at `/api/upload/tus`.

- **Chunked Storage**: Uploads are stored as temporary files in `public/uploads/{taskId}`.
- **Idempotent Initialization (POST)**: If a client attempts to initialize an upload for a `taskId` that already has a partial file on disk, the server returns the existing file's location instead of overwriting it. This allows for seamless resumption even if the client loses its local state.
- **Patching (PATCH)**: Handles the binary chunk data and appends it to the file.
- **Completion**: Once the file offset matches the total size, the system updates the recognition task status to `pending` and triggers the LLM processing.

### 2. Client-side (UploadManager)
The `UploadManager` wraps the `tus-js-client` with YuHeng-specific logic.

- **Unique Fingerprinting**: Every upload is fingerprinted using its `taskId`. This ensures that across page refreshes or app restarts, the client can always find and resume the correct upload.
- **Aggressive Retries**:
  - **100 Retries**: The system is configured to retry up to 100 times before giving up.
  - **Exponential Backoff**: Intervals grow from 1s to a maximum of 3 minutes.
  - **5-Hour Window**: Total retry time covers over 5 hours, ensuring recovery from long disconnections (e.g., long transit or sleep).
- **Small Chunk Size**: Uses `256KB` chunks to maximize success rates on extremely weak signals.

### 3. State Management (RecognitionStore)
The `RecognitionStore` acts as the orchestrator for the upload lifecycle.

- **Silent Recovery**: Network or timeout errors during the `uploading` phase are suppressed in the UI. The task remains visually as "Uploading" while the background process handles retries, providing a smoother user experience.
- **Proactive Resumption**:
  - Listens for the browser `online` event.
  - Scans the task queue for any interrupted uploads.
  - Triggers a stability delay (1-2s) before proactively calling `resumeUploading`.
- **Persistence**: Storing `imageData` (Base64) in `localStorage` allows the app to resume an upload that was started hours ago, even if the browser tab was closed.

## User Experience Design
- **Zero-Interaction Recovery**: If a user locks their iPhone during an upload, the upload pauses. When they unlock and return to the app, the system automatically detects the connection and resumes without the user needing to click "Retry".
- **Error Filtering**: Only fatal, non-network errors (e.g., "File not found" or "Server authentication failure") will transition a task to the `failed` state and show the "Retry" button.
