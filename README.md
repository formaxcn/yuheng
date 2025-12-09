# YuHeng (玉衡)

AI-powered calorie tracker, built with Next.js 14, Tailwind CSS, and Google Gemini.

## Features

- **Smart Add**: Snap a photo of your meal (1-6 dishes), and AI will identify dishes, estimate calories/macros, and weight.
- **Local Database**: All data is stored locally in a SQLite database (`nutrition.db`). No external account required.
- **PWA Ready**: Install on your phone for a native app-like experience.
- **Privacy Focused**: Your API keys and tokens are stored locally.

## Prerequisites

1.  **Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).

## Deployment

### Docker (Standalone)

You can deploy this on any server with Docker installed (Synology, TrueNAS, VPS).

**One-Click Deployment (3 Commands):**

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/YuHeng.git
cd YuHeng

# 2. Create .env.local (Optional if passing env in run command)
echo "GEMINI_API_KEY=your_key_here" > .env.local
echo "MODEL=gemini-1.5-flash" >> .env.local

# 3. Run with Docker Compose
docker-compose up -d --build
```

Access the app at `http://localhost:3000`.

### Environment Variables

| Variable | Description | Default |
|String | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API Key | Required |
| `MODEL` | Gemini Model Name | `gemini-1.5-flash` |

## Architecture Design

### Overview
YuHeng is a specialized food logging application using AI. It acts as a bridge between the user and the Gemini AI API, storing data in a local SQLite database.

### Core Components
1.  **Frontend (Next.js App Router)**:
    -   Built with React and Tailwind CSS.
    -   Handles user UI, camera interactions, and state management.
    -   communicates with Next.js API Routes.

2.  **API Layer (Next.js API Routes)**:
    -   `/api/nutrition/*`: Handles interaction with local SQLite database.
    -   `/api/gemini`: Handles interaction with Google Gemini. It sends image data and prompts to Gemini and processes the JSON response.

3.  **Services**:
    -   `lib/db.ts`: SQLite database client and repositories.
    -   `lib/gemini.ts`: Handles prompt construction and response parsing for Gemini.

### Data Flow
1.  User takes a photo -> Frontend.
2.  Frontend -> `/api/gemini` -> Google Gemini API.
3.  Gemini returns JSON analysis -> Frontend displays draft.
4.  User confirms -> Frontend -> `/api/nutrition/smart-add` -> SQLite Database (creates recipes/entries/dishes).

## Development & Debugging

### Local Setup
1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Set up environment variables in `.env.local` (see below).
4.  Run the development server: `npm run dev`.

### Debugging & Logging
We use a custom logging utility that supports different log levels.

-   **Enable Debug Logs**: Set `LOG_LEVEL=debug` in your `.env.local` file.
    ```env
    LOG_LEVEL=debug
    ```
    This will output detailed logs to the console.

-   **Production**: Ensure `LOG_LEVEL` is set to `info` (default) or unset to avoid leaking sensitive data in logs.

### VSCode Debugging
A `launch.json` is provided for VSCode.
1.  Go to the "Run and Debug" side bar.
2.  Select "Next.js: debug (server-side)" or "Next.js: debug (client-side)".
3.  Press F5 to start debugging.

## Development

```bash
npm install
npm run dev
```

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Google Gemini AI
- SQLite (better-sqlite3)

