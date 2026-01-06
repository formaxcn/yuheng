# YuHeng Architecture

YuHeng is a modern nutrition tracking application built with a focus on speed, ease of use, and AI-powered insights.

## Technology Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (via `postgres` library)
-   **Schema Management**: [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
-   **AI Providers**: [Google Gemini](https://deepmind.google/technologies/gemini/), [OpenAI](https://openai.com/), and OpenAI-compatible APIs (DeepSeek, Qwen-VL, GLM-4V, Doubao, etc.)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## High-Level Project Structure

```text
yuheng/
├── app/                # Next.js App Router (Pages and API Routes)
│   ├── api/            # Backend API endpoints (Nutrition, LLM, Settings)
│   ├── add/            # Meal entry page with async recognition
│   ├── settings/       # User preferences, meal times, and LLM configuration
│   └── page.tsx        # Homepage (Dashboard)
├── components/         # Reusable UI components (Shadcn UI)
├── lib/                # Core logic and shared utilities
│   ├── db/             # Database abstraction layer (PostgreSQL adapter)
│   ├── llm/            # LLM provider factory and implementations
│   ├── db.ts           # Unified database access functions
│   ├── prompts.ts      # Prompt management system with variable injection
│   ├── api-client.ts   # Frontend API client
│   ├── units.ts        # Unit conversion (kcal/kJ, g/oz)
│   └── logger.ts       # Unified logging (Pino)
├── migrations/         # Database schema migrations (node-pg-migrate)
├── prompts/            # AI instruction templates (.txt files)
├── public/             # Static assets
└── types/              # TypeScript definitions
```

## Core Design Patterns

### Database Adapter Pattern
YuHeng uses a PostgreSQL adapter for all database operations. The system connects to PostgreSQL using the connection string from environment variables (`DATABASE_URL`). Database schema is versioned using node-pg-migrate, allowing for controlled schema evolution.

### LLM Provider Factory
A factory pattern is used to instantiate the correct LLM provider (Gemini, OpenAI, or OpenAI-compatible) based on user settings. This allows the application to stay provider-agnostic for its core recognition logic.

### Prompt Management
Prompts are decoupled from the code and stored in the `prompts/` directory. The `PromptManager` handles loading these templates and injecting runtime variables (such as units and language preferences).

## Data Flow

1.  **Input**: User enters food description or uploads an image.
2.  **Analysis**: The `app/api/nutrition/recognize` creates a background `RecognitionTask` and triggers the LLM analysis via the `LLMFactory`.
3.  **Storage**: Validated food data is stored in the `dishes` table, which snapshots the recipe information at the time of entry.
4.  **Display**: The dashboard fetches aggregate data via `/api/nutrition/stats` and displays daily progress against targets.
