# Docker & Deployment

YuHeng is designed for easy deployment using Docker with PostgreSQL. The application automatically runs database migrations on startup.

## Docker Image

The application is built using a multi-stage `Dockerfile` based on `node:24-alpine` for the smallest possible production footprint. It uses Next.js [standalone output](https://nextjs.org/docs/advanced-features/output-file-tracing) for efficiency.

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | (Required) |

## Automatic Database Migrations

The Docker image includes an entrypoint script that automatically handles database migrations on startup:

1. **Waits for PostgreSQL**: The script waits until the database is ready before proceeding
2. **Runs Migrations**: Automatically executes pending migrations using `node-pg-migrate`
3. **Starts Application**: Launches the Next.js application after successful migrations

This ensures your database schema is always up-to-date without manual intervention.

## Deployment Options

### Using Docker Compose (Pre-built Image)

The default `docker-compose.yml` uses the pre-built image from GitHub Container Registry for quick deployment:

```bash
docker-compose up -d
```

This will:
- Pull the latest `ghcr.io/formaxcn/yuheng:latest` image
- Start a PostgreSQL database
- Automatically run migrations and start the application

### Using Docker Compose (Local Build)

For development or custom builds, use `docker-compose.local.yml` to build the image locally:

```bash
docker-compose -f docker-compose.local.yml up -d
```

This will:
- Build the Docker image from source
- Start a PostgreSQL database
- Automatically run migrations and start the application

### Using Docker Run

For simple deployments, you can use `docker run` directly:

```bash
docker run -d \
  --name yuheng \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@your-db-host:5432/yuheng \
  -v ./data:/app/data \
  ghcr.io/formaxcn/yuheng
```

## Security & Best Practices

- **Non-Root User**: The image runs as the `nextjs` user (UID 1001) for improved security.
- **Stand-alone Mode**: Leverages Next.js standalone mode to minimize image size and external dependencies.
- **Health Checks**: The `docker-compose.yml` includes a health check for the database to ensure smooth startup.
- **Automatic Migrations**: Database schema is automatically updated on container startup.
- **Process Management**: Uses `tini` as PID 1 to properly handle signals and prevent zombie processes.
