# Database Adapter

YuHeng uses PostgreSQL as its primary database, with schema versioning managed by node-pg-migrate.

## Architecture

The database layer is located in `lib/db/`:
- `interface.ts`: Defines the `DatabaseAdapter` interface.
- `index.ts`: The main entry point that initializes the PostgreSQL adapter.
- `postgres.ts`: Implementation of the `DatabaseAdapter` using `postgres` (via `pg`).

## Database Configuration

YuHeng requires a PostgreSQL connection string to be set via environment variables:
- `DATABASE_URL`: PostgreSQL connection string (required)

Example connection string:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/yuheng
```

## Features

- **Automated Initialization**: The adapter verifies database connection on startup.
- **Unified Interface**: The application code (API routes, etc.) interacts with a single `db` object.
- **Asynchronous Operations**: All database methods are asynchronous to ensure non-blocking execution in the Next.js environment.

## Schema Versioning

YuHeng uses [node-pg-migrate](https://github.com/salsita/node-pg-migrate) for database schema version management. This allows for:
- Versioned database schema changes
- Easy rollback of migrations
- Consistent database state across environments

### Running Migrations

```bash
# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:down

# Create a new migration
npm run db:migrate:create migration-name
```

## Local Development

To set up PostgreSQL for local development:

1. Start PostgreSQL using Docker Compose:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
npm run db:migrate
```

3. Start the development server:
```bash
npm run dev
```

The application will automatically connect to the PostgreSQL database using the connection string from `.env`.
