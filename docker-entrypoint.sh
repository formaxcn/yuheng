#!/bin/sh
set -e

echo "Starting YuHeng container..."

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."

    # 等待数据库就绪
    until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
        echo "PostgreSQL is not ready yet - sleeping 1s"
        sleep 1
    done

    echo "PostgreSQL is ready!"

    echo "Running database migrations..."
    bunx node-pg-migrate up \
        --database-url-var DATABASE_URL \
        --migrations-dir migrations \
        --migrations-table pgmigrations \
        --single-transaction \
        --no-lock

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