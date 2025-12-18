# YuHeng Architecture

YuHeng is a modern nutrition tracking application built with a focus on speed, ease of use, and AI-powered insights.

## Technology Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Database**: [SQLite](https://www.sqlite.org/) (via `better-sqlite3`)
-   **AI Engine**: [Google Gemini AI](https://deepmind.google/technologies/gemini/) (for image recognition and food analysis)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## High-Level Project Structure

```text
yuheng/
├── app/                # Next.js App Router (Pages and API Routes)
│   ├── api/            # Backend API endpoints
│   ├── add/            # Meal entry page
│   ├── settings/       # User preferences and targets
│   └── page.tsx        # Homepage (Dashboard)
├── components/         # Reusable UI components
├── lib/                # Core logic, DB helpers, and AI integration
│   ├── db.ts           # SQLite schema and repository functions
│   ├── gemini.ts       # Gemini AI client and analysis logic
│   ├── api-client.ts   # Frontend API client
│   └── units.ts        # Unit conversion and display logic
├── public/             # Static assets
├── types/              # TypeScript definitions
└── nutrition.db        # SQLite database file (generated)
```

## Data Flow

1.  **Input**: User enters food description or uploads an image.
2.  **Analysis**: The `lib/gemini.ts` sends data to Gemini AI to identify food items and estimate nutritional values.
3.  **Storage**: Validated food data is stored in the `dishes` table, linked to an `entries` record.
4.  **Display**: The frontend fetches data via `/api/nutrition/stats` and displays daily progress against targets.
