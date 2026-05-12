# Docker Deployment

YuHeng supports two deployment modes:

| Mode | Database | Complexity | Best For | Future Extensions |
|------|----------|------------|----------|-------------------|
| **Single Container** | SQLite | Very Low | Personal use, simple setup | - |
| **Docker Compose** | PostgreSQL | Medium | Family/team, scalability | S3/MinIO for image storage, multi-user |

---

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of RAM available
- An API key from one of the supported AI providers (Gemini, OpenAI, Zhipu, or OpenAI-compatible APIs)

---

### Option 1: Single Container (Simplest, SQLite)

For personal use or quick evaluation, a single container with SQLite is recommended.
Just mount a single data directory and you're done.

```bash
# Create data directory
mkdir -p ./data

# Run the container
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  -e DATABASE_URL=file:/app/data/yuheng.db \
  ghcr.io/formaxcn/yuheng
```

**Access**: http://localhost:3000

**Backup**: Just copy the `./data` directory.

---

### Option 2: Docker Compose (PostgreSQL, Scalable)

1. **Clone the repository**
   ```bash
   git clone https://github.com/formaxcn/yuheng.git
   cd yuheng
   ```

2. **Configure environment variables (optional)**
   
   You can either:
   - Set API keys via environment variables (copy `.env.example` to `.env` and edit)
   - Or configure everything later in the application's Settings UI

3. **Start the services**
   ```bash
   docker compose up -d
   ```

   The pre-built multi-arch image will be pulled automatically from GitHub Container Registry.

4. **Access the application**
   - Open http://localhost:3000 in your browser
   - Go to Settings → AI Recognition & LLM Setup to configure your API key
   - First user is created automatically (default user)

### Development Mode

For local development with hot-reload:

1. **Start only the database**
   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

2. **Run the app locally**
   ```bash
   cp .env.example .env
   # Configure your .env
   bun install
   bun run dev
   ```

## Configuration

### Environment Variables

**Database Selection**
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string.<br>SQLite: `file:/app/data/yuheng.db`<br>PostgreSQL: `postgresql://user:password@postgres:5432/yuheng` |

**AI Provider Keys (at least one required)**
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No* | Google Gemini API key |
| `OPENAI_API_KEY` | No* | OpenAI API key (also works for OpenAI-compatible APIs like DeepSeek, Qwen, Doubao) |
| `ZHIPU_API_KEY` | No* | Zhipu AI GLM-4V API key |

*At least one API key is required for food recognition to work.
You can set this either via environment variable or directly in the Settings UI.

**S3/MinIO (Future)**
These variables are reserved for future S3-compatible object storage support:
| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | S3/MinIO endpoint (e.g., `http://minio:9000`) |
| `S3_ACCESS_KEY` | S3/MinIO access key |
| `S3_SECRET_KEY` | S3/MinIO secret key |
| `S3_BUCKET` | S3/MinIO bucket name |

### Volumes

#### Single Container (SQLite)
```
./data/                     # Mounted as /app/data inside container
├── yuheng.db              # SQLite database
└── images/                # Uploaded images
```

#### Docker Compose (PostgreSQL)
- `postgres_data` - PostgreSQL database volume
- `app_data` - Application data volume (uploaded images, etc.)
- `minio_data` - *(Future)* S3/MinIO object storage volume

## Database Migration

Migrations run automatically on container startup using `docker-entrypoint.sh`:
1. Waits for PostgreSQL to be ready
2. Runs all pending migrations using drizzle-kit
3. Starts the Next.js application

## Troubleshooting

### View logs
```bash
docker compose logs -f
```

### Restart services
```bash
docker compose restart
```

### Reset everything (including data)
```bash
docker compose down -v
docker compose up -d
```

### Database connection issues
1. Check PostgreSQL is healthy: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Verify password matches in both services

## Production Deployment

For production deployment:

1. Use a reverse proxy (Nginx, Traefik, etc.)
2. Enable HTTPS
3. Consider using environment variables or secrets management
4. Backup the database volume regularly

Example production override:
```yaml
# docker-compose.prod.yml
services:
  app:
    environment:
      - NODE_ENV=production
      - VIRTUAL_HOST=yuheng.yourdomain.com
      - LETSENCRYPT_HOST=yuheng.yourdomain.com
    networks:
      - default
      - web

networks:
  web:
    external: true
```
