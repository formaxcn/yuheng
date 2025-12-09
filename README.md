# WgerLens

A local nutrition tracking app that uses Gemini for food recognition.

## Features
- 📸 Photo-based food logging
- 🤖 Auto-recognition of dishes using Gemini
- 📊 Daily nutrition stats & weekly history
- 🍽️ Support for backfilling meals (Breakfast, Lunch, Dinner, Snack)
- 🐳 Docker support with persistent DB

## Getting Started

1. Clone the repo
2. Copy `.env.local.example` to `.env.local` and add your Gemini API Key.
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:3000`

## Docker Usage

Build the image:
```bash
docker build -t wgerlens .
```

Run the container:
```bash
# Create a data directory
mkdir data

# Run container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e GEMINI_API_KEY=your_key_here \
  wgerlens
```

The database will be stored in your local `data` folder.

## API Documentation

API documentation is available at `/api/docs` (JSON). 
You can import this into Postman or Swagger UI.

## Configuration

Meal times can be configured in the database `settings` table. Defaults:
- Breakfast: 06:00 - 10:00 (Default 08:00)
- Lunch: 10:00 - 14:00 (Default 12:00)
- Dinner: 17:00 - 19:00 (Default 18:00)
- Snack: All other times (Default 21:00)

## Roadmap

- [ ] Support for multiple users
- [ ] Migrate database to Postgres

