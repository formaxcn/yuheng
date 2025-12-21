# yuheng

YuHeng(玉衡 Jade Balance) - A local nutrition tracking app named after the fifth and brightest star in the Big Dipper constellation in traditional Chinese astronomy. Just as this star serves as a guiding and balancing force, YuHeng aims to help users in tracking their nutrition effectively.

## Features
- 📸 Photo-based food logging
- 🤖 Auto-recognition of dishes using Gemini
- 📊 Daily nutrition stats & weekly history
- 🍽️ Support for backfilling meals (Breakfast, Lunch, Dinner, Snack)
- 🐳 Docker support with persistent DB
- ⚡ Asynchronous image recognition queue
- ⚖️ Unit conversion (kcal/kJ, g/oz)
- ⏰ Custom meal times configuration
- 👥 Meal sharing & portion splitting

## Getting Started

1. Clone the repo
2. Copy `example.env.local` to `.env.local` and add your Gemini API Key.
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:3000`

## Docker Usage

Build the image:
```bash
docker build -t yuheng .
```

Run the container:
```bash
# Create a data directory
mkdir data

# Run container
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  -e GEMINI_API_KEY=your_api_key \
  ghcr.io/formaxcn/yuheng
```

When you mount an empty `data` directory, the container will automatically initialize the database with default settings. If you mount a directory that already contains a `nutrition.db` file, the database will remain untouched.

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API Key | **Yes** | - |
| `MODEL` | Gemini Model to use | No | `gemini-2.5-flash` |

The database will be stored in your local `data` folder.

## API Documentation

API documentation is available at `/api/docs` (JSON). 
You can import this into Postman or Swagger UI.

## Project Documentation

Detailed technical documentation for YuHeng can be found in the [docs](./docs/index.md) folder:

- [Architecture](./docs/architecture.md): Overview of the tech stack and project structure.
- [System Design](./docs/system_design.md): In-depth look at core flows and AI integration.
- [Database Design](./docs/database_design.md): Schema definitions and relationship diagrams.
- [Page Implementation](./docs/page_implementations.md): Breakdown of the app's frontend design.

## Configuration

Meal times can be configured in the database `settings` table. Defaults:
- Breakfast: 06:00 - 10:00 (Default 08:00)
- Lunch: 10:00 - 14:00 (Default 12:00)
- Dinner: 17:00 - 19:00 (Default 18:00)
- Snack

## Roadmap

- [ ] Support for multiple users
- [ ] Migrate database to Postgres
- [ ] Add support for Doubao
