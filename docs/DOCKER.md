# Docker Deployment

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB of RAM available
- An API key from one of the supported AI providers (Gemini, OpenAI, Claude, etc.)

### Run with Docker Compose

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

Only `DATABASE_URL` is strictly required. All other settings can be configured
in the application's Settings UI after starting.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GEMINI_API_KEY` | No* | Google Gemini API key |
| `OPENAI_API_KEY` | No* | OpenAI API key |
| `ANTHROPIC_API_KEY` | No* | Anthropic Claude API key |
| `DASHSCOPE_API_KEY` | No* | Alibaba Qwen API key |
| `DOUBAO_API_KEY` | No* | ByteDance Doubao API key |
| `DEEPSEEK_API_KEY` | No* | DeepSeek API key |
| `ZHIPU_API_KEY` | No* | Zhipu AI API key |

*At least one API key is required for food recognition to work.
You can set this either via environment variable or directly in the Settings UI.

### Volumes

The Docker setup creates persistent volumes:
- `postgres_data` - Database data
- `app_data` - Application data (uploaded images, etc.)

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
