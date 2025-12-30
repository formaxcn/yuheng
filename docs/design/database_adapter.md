# Multi-Database Support

YuHeng is designed to be database-agnostic, supporting both **SQLite** and **PostgreSQL**. This is achieved through a common repository interface and a factory-based adapter pattern.

## Architecture

The database layer is located in `lib/db/`:
- `interface.ts`: Defines the `DatabaseAdapter` interface that all database implementations must follow.
- `index.ts`: The main entry point that detects the environment and returns the appropriate adapter.
- `sqlite.ts`: Implementation of the `DatabaseAdapter` using `better-sqlite3`.
- `postgres.ts`: Implementation of the `DatabaseAdapter` using `postgres` (via `pg`).

## Database Selection Logic

YuHeng automatically selects the database based on environment variables:
1. If `POSTGRES_URL` (or `DATABASE_URL`) is present, it uses **PostgreSQL**.
2. Otherwise, it defaults to **SQLite**.

The default SQLite database path is `./nutrition.db`, which can be overridden using the `DB_PATH` environment variable.

## Features

- **Automated Initialization**: Both adapters handle schema creation automatically if the database is empty.
- **Unified Interface**: The application code (API routes, etc.) interacts with a single `db` object and isn't aware of the underlying database type.
- **Asynchronous Operations**: All database methods are asynchronous to ensure non-blocking execution in the Next.js environment.

## Configuring PostgreSQL

To use PostgreSQL, provide a valid connection string:
```bash
POSTGRES_URL=postgres://user:password@localhost:5432/yuheng
```
