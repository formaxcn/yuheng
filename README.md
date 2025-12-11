# yuheng

玉衡 (Yu Heng) - A local nutrition tracking app named after the fifth and brightest star in the Big Dipper constellation in traditional Chinese astronomy. Just as this star serves as a guiding light in the night sky, this app aims to guide users toward balanced nutrition through intuitive food recognition and tracking using Google Gemini.

## Features
- 📸 Photo-based food logging
- 🤖 Auto-recognition of dishes using Gemini
- 📊 Daily nutrition stats & weekly history
- 🍽️ Support for backfilling meals (Breakfast, Lunch, Dinner, Snack)
- 🐳 Docker support with persistent DB

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

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Your Google Gemini API Key | **Yes** | - |
| `MODEL` | Gemini Model to use | No | `gemini-2.5-flash` |

The database will be stored in your local `data` folder.

## API Documentation

API documentation is available at `/api/docs` (JSON). 
You can import this into Postman or Swagger UI.

## Configuration

Meal times can be configured in the database `settings` table. Defaults:
- Breakfast: 06:00 - 10:00 (Default 08:00)
- Lunch: 10:00 - 14:00 (Default 12:00)
- Dinner: 17:00 - 19:00 (Default 18:00)
- Snack

## Roadmap

- [ ] Support for multiple users
- [ ] Migrate database to Postgres

