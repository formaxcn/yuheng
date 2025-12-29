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
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:3000`
5. Configure your Gemini API Key in the settings page.

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
  ghcr.io/formaxcn/yuheng
```

When you mount an empty `data` directory, the container will automatically initialize the database with default settings. If you mount a directory that already contains a `nutrition.db` file, the database will remain untouched.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POSTGRES_URL` | PostgreSQL connection string (if using Postgres) | No | SQLite |
| `DB_PATH` | Path to SQLite database file | No | `./nutrition.db` |

The app will automatically use PostgreSQL if `POSTGRES_URL` is provided. Otherwise, it defaults to SQLite.

## Docker Usage

### Docker Run (SQLite)

```bash
# Create a data directory for SQLite
mkdir data

# Run container
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/formaxcn/yuheng
```

### Docker Compose (PostgreSQL)

You can easily start YuHeng with a PostgreSQL database using Docker Compose:

1. Run:
```bash
docker-compose up -d
```
This will start both the YuHeng app and a PostgreSQL database.

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

Settings like meal times, daily targets, and API keys can be configured directly in the app's settings page or via environment variables.

## Roadmap

- [ ] Support for multiple users
- [x] Migrate database to Postgres (Beta)
- [x] Packaged food scanning & recognition
- [ ] Add support for Doubao
- [ ] Mobile app version
 
 ## Screenshots
 
 <p align="center">
   <img src="./docs/screenshots/main.png" alt="Main Page" />
   <img src="./docs/screenshots/add.png" alt="Add Meal" />
   <img src="./docs/screenshots/setting.png" alt="Settings" />
 </p>
