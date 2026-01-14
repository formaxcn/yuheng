#!/bin/sh
set -e

echo "Starting YuHeng container..."

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."

    # 优先使用最常见的路径（Alpine 几乎总是放在 /usr/bin）
    if command -v pg_isready >/dev/null 2>&1; then
        PG_ISREADY="pg_isready"
        echo "Found pg_isready via PATH at: $(which pg_isready)"
    else
        # fallback 到搜索
        PG_ISREADY=$(find /usr -type f -name pg_isready -executable 2>/dev/null | head -n1)
    fi

    if [ -z "$PG_ISREADY" ]; then
        echo "ERROR: pg_isready not found in container. Cannot wait for database."
        echo "Falling back to simple port check using nc (netcat)."
        until nc -z "${POSTGRES_HOST:-postgres}" 5432 >/dev/null 2>&1; do
            echo "PostgreSQL port 5432 not ready yet - sleeping 1s"
            sleep 1
        done
    else
        echo "Using pg_isready: $PG_ISREADY"
        until "$PG_ISREADY" -d "$DATABASE_URL" >/dev/null 2>&1; do
            echo "PostgreSQL is not ready yet - sleeping 1s"
            sleep 1
        done
    fi

    echo "PostgreSQL is ready!"

    echo "Running database migrations..."
    # 使用 bunx 调用本地安装的 node-pg-migrate
    bunx node-pg-migrate up --config db.config.js

    if [ $? -eq 0 ]; then
        echo "Migrations completed successfully!"
    else
        echo "Migration failed!"
        exit 1
    fi
else
    echo "WARNING: DATABASE_URL not set. Skipping database wait and migrations."
fi

echo "Starting application..."
exec "$@"