# Database Adapter

YuHeng uses an adapter pattern to support both SQLite and PostgreSQL databases. The appropriate adapter is automatically selected based on the `DATABASE_URL` environment variable.

## Architecture

The database layer is located in `lib/db/`:
- `interface.ts`: Defines the `IDatabaseAdapter` interface.
- `index.ts`: Factory that selects and initializes the appropriate adapter.
- `postgres.ts`: PostgreSQL implementation of the adapter.
- `sqlite.ts`: SQLite implementation of the adapter.
- `schema.ts`: Drizzle schema shared between both databases.

## Database Selection

| Database | Connection String Format | Use Case |
|----------|-------------------------|----------|
| SQLite | `file:/app/data/yuheng.db` | Single container, personal use, simple setup |
| PostgreSQL | `postgresql://user:password@host:5432/yuheng` | Docker Compose, multi-user, scalable deployments |

## Features

- **Unified Interface**: Application code interacts with a single `db` object, database-agnostic.
- **Automated Initialization**: Adapter verifies connection on startup.
- **Asynchronous Operations**: All database methods are async for non-blocking Next.js execution.
- **Schema Consistency**: Same schema for both databases, Drizzle ORM handles dialect differences.
- **Multi-User Ready**: Full support for users, authentication, and data isolation in both databases.

## Schema Versioning

YuHeng uses [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) for database schema version management:
- Shared schema definition
- Dialect-specific migrations generated automatically
- Consistent database state across environments

## Local Development

**With PostgreSQL (Docker Compose):**
```bash
docker compose up -d
bun run db:migrate
bun run dev
```

**With SQLite:**
```bash
# set in .env: DATABASE_URL=file:./data/yuheng.db
bun run db:migrate:sqlite
bun run dev
```

The application automatically connects using the connection string from `.env`.
