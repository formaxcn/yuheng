# WgerLens

AI-powered calorie tracker for Wger (wger.de), built with Next.js 14, Tailwind CSS, and Google Gemini.

## Features

- **Smart Add**: Snap a photo of your meal (1-6 dishes), and AI will identify dishes, estimate calories/macros, and weight.
- **One-Click Log**: Automatically find or create ingredients in Wger and log them to your nutritional plan.
- **PWA Ready**: Install on your phone for a native app-like experience.
- **Privacy Focused**: Your API keys and tokens are stored locally or in your own server env.

## Prerequisites

1. **Wger Account**: You need an account on [wger.de](https://wger.de) or your self-hosted instance.
2. **Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).

### How to get Wger Application Token
1. Go to [wger.de](https://wger.de) and log in.
2. Navigate to **Settings** -> **API Keys** (or visit `/en/user/api-key`).
3. Generate a new API key (Token).

### How to find Nutritional Plan ID
WgerLens automatically fetches your plans.
1. Open WgerLens.
2. Go to **Settings**.
3. Enter your Token and Base URL.
4. Click "Load Plans".
5. Select your desired plan from the dropdown.

## Deployment

### Docker (Standalone)

You can deploy this on any server with Docker installed (Synology, TrueNAS, VPS).

**One-Click Deployment (3 Commands):**

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/WgerLens.git
cd WgerLens

# 2. Create .env.local (Optional if passing env in run command)
echo "GEMINI_API_KEY=your_key_here" > .env.local
echo "MODEL=gemini-1.5-flash" >> .env.local
# WGER_BASE_URL is optional here as it can be set in UI, but good to have default
echo "WGER_BASE_URL=https://wger.de" >> .env.local

# 3. Run with Docker Compose
docker-compose up -d --build
```

Access the app at `http://localhost:3000`.

### Environment Variables

| Variable | Description | Default |
|String | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API Key | Required |
| `MODEL` | Gemini Model Name | `gemini-1.5-flash` |
| `WGER_BASE_URL` | Default Wger Instance URL | `https://wger.de` |

## Architecture Design

### Overview
WgerLens is a specialized client for Wger, designed to simplify food logging using AI. It acts as a bridge between the user, the Gemini AI API, and the Wger API.

### Core Components
1.  **Frontend (Next.js App Router)**:
    -   Built with React and Tailwind CSS.
    -   Handles user UI, camera interactions, and state management.
    -   communicates with Next.js API Routes.

2.  **API Layer (Next.js API Routes)**:
    -   `/api/wger/*`: Proxies requests to the Wger API. This avoids CORS issues and allows for secure handling of tokens if needed (though currently tokens are passed from client).
    -   `/api/gemini`: Handles interaction with Google Gemini. It sends image data and prompts to Gemini and processes the JSON response.

3.  **Services**:
    -   `lib/wger.ts`: A typed client for interacting with Wger endpoints (plans, meals, ingredients).
    -   `lib/gemini.ts`: Handles prompt construction and response parsing for Gemini.

### Data Flow
1.  User takes a photo -> Frontend.
2.  Frontend -> `/api/gemini` -> Google Gemini API.
3.  Gemini returns JSON analysis -> Frontend displays draft.
4.  User confirms -> Frontend -> `/api/wger/*` -> Wger API (creates ingredients/meals).

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
    This will output detailed logs to the console, including:
    -   Full Wger API request URLs and methods.
    -   Response status and data summaries.
    -   Gemini prompts and raw response text.

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
- Wger API v2
