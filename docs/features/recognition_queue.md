# Recognition Queue & Guided Retry

YuHeng implements a sophisticated client-side queue for image recognition tasks. This allows users to upload multiple photos in quick succession and handle recognition results asychronously.

## Core Architecture

The recognition system is split between a persistent client-side store and a stateless backend processing API.

### 1. Client-Side Store (`lib/recognition-store.ts`)
- **Persistence**: All tasks are stored in the browser's `localStorage` (`yuheng_recognition_queue`). This ensures that pending analysis tasks survive page reloads or accidental tab closures.
- **Image Caching**: Images are stored as **Base64 strings** directly within the local storage. This adheres to the design philosophy of not storing user photos on the server database.
- **State Management**: Uses React's `useSyncExternalStore` for high-performance, reactive UI updates.
- **Background Polling**: The store automatically manages periodic polling of the `/api/nutrition/tasks/[id]` endpoint for every non-terminal task.

### 2. Recognition Flow
1. **Initiation**: User uploads an image on `/add`.
2. **Immediate Redirection**: The app calls `POST /api/nutrition/recognize`, gets a `taskId`, saves the Base64 image + `taskId` to the store, and immediately redirects the user to the Home page.
3. **Background Processing**: The `RecognitionStore` starts polling. The UI on the Home page (`RecognitionQueue` component) displays the task's progress.
4. **Completion**: Once the AI analysis is done, the task status changes to `completed`, and a "View Results" button appears.

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
