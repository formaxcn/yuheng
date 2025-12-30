# Docker & Deployment

YuHeng is designed for easy deployment using Docker, supporting both single-container (SQLite) and multi-container (PostgreSQL) setups.

## Docker Image

The application is built using a multi-stage `Dockerfile` based on `node:24-alpine` for the smallest possible production footprint. It uses Next.js [standalone output](https://nextjs.org/docs/advanced-features/output-file-tracing) for efficiency.

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `DB_PATH` | Path to the SQLite database | `/app/data/nutrition.db` |
| `POSTGRES_URL` | PostgreSQL connection string | (Optional) |

## Deployment Options

### 1. Single Container (SQLite)

This is the simplest way to run YuHeng. Use a volume to persist your database.

```bash
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/formaxcn/yuheng
```

### 2. Multi-Container (PostgreSQL)

Use `docker-compose` to run the app with a dedicated PostgreSQL database.

```yaml
# docker-compose.yml
services:
  app:
    image: ghcr.io/formaxcn/yuheng
    ports: ["3000:3000"]
    environment:
      - POSTGRES_URL=postgres://yuheng:yuheng@db:5432/yuheng
    depends_on: { db: { condition: service_healthy } }
    volumes: ["./data:/app/data"]

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=yuheng
      - POSTGRES_PASSWORD=yuheng
      - POSTGRES_DB=yuheng
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yuheng"]
```

## Security & Best Practices

- **Non-Root User**: The image runs as the `nextjs` user (UID 1001) for improved security.
- **Stand-alone Mode**: Leverages Next.js standalone mode to minimize image size and external dependencies.
- **Health Checks**: The `docker-compose.yml` includes a health check for the database to ensure smooth startup.
