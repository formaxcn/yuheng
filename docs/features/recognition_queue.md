# Recognition Queue & Guided Retry

YuHeng implements a sophisticated client-side queue for image recognition tasks. This allows users to upload multiple photos in quick succession and handle recognition results asychronously.

## Core Architecture

The recognition system is split between a persistent client-side store and a persistent server-side queue managed by PostgreSQL.

### 1. Client-Side Store (`lib/recognition-store.ts`)
- **Persistence**: All tasks are stored in the browser's `localStorage` (`yuheng_recognition_queue`). This ensures that pending analysis tasks survive page reloads.
- **Image Caching**: Images are stored as **Base64 strings** in local storage before upload.
- **State Management**: Uses React's `useSyncExternalStore` for reactive UI updates.
- **Background Polling**: The store polls the `/api/nutrition/tasks/[id]` endpoint to check for status updates from the server-side queue.

### 2. Server-Side Queue (`lib/queue.ts`)
- **Persistence**: Powered by **pg-boss**, jobs are stored in the database (`pgboss` schema). This ensures tasks survive server restarts.
- **Worker Registration**: The worker is initialized via `instrumentation.ts` on server boot, ensuring it starts automatically.
- **Dynamic Configuration**:
    - `queue_concurrency`: Controls parallel processing (Default: 5).
    - `queue_retry_limit`: Automatic retries on failure (Default: 3).

### 3. Recognition Flow
1. **Initiation**: User uploads an image on `/add` or via Home page.
2. **Immediate Redirection**: The app calls `POST /api/nutrition/recognize`, which enqueues a job in `pg-boss` and returns a `taskId`.
3. **Background Processing**: The `QueueManager` worker picks up the job, calls the AI provider, and updates the task status in the `recognition_tasks` table.
4. **Polling**: The client-side `RecognitionStore` polls for completion.
5. **Completion**: Once finished, a "View Results" button appears in the UI.

## Guided Retry Mechanism

A key refinement of the recognition system is the **Guided Retry** feature, which allows users to improve AI accuracy through natural language feedback.

### How it works
- **User Feedback**: Users can trigger a retry from either a failed task in the queue or a completed task on the results page.
- **Instruction Injection**: The "Guided Retry" dialog allows users to provide hints (e.g., "The white portion is steamed egg, not tofu").
- **Prompt Composition**: The backend appends these instructions to the base system prompt:
  ```typescript
  if (userPrompt) {
      promptText += `\n\nUSER ADDITIONAL INSTRUCTIONS: ${userPrompt}\nPlease prioritize these instructions while maintaining the overall output format.`;
  }
  ```
- **Re-Processing**: The system re-analyzes the **original photo** using the new instructions, allowing for high-quality corrections without re-uploading the image.

## Database Integration (`recognition_tasks` table)
While images are stored on the client, the task metadata is tracked in PostgreSQL to support server-side asynchronous processing.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique task identifier |
| `status` | STRING | `pending`, `processing`, `completed`, `failed` |
| `result` | JSON | The recognized list of dishes |
| `error` | STRING | Error message if analysis failed |
| `created_at` | TIMESTAMP | Task creation time |
| `updated_at` | TIMESTAMP | Last status update |
