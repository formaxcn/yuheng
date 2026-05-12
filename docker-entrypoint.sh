#!/bin/sh
set -e

echo "Starting YuHeng container..."

if [ -n "$DATABASE_URL" ]; then
    # Check if using SQLite (URL starts with file:)
    if echo "$DATABASE_URL" | grep -q "^file:"; then
        echo "Detected SQLite database mode."
    else
        echo "Waiting for PostgreSQL to be ready..."

        until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
            echo "PostgreSQL is not ready yet - sleeping 1s"
            sleep 1
        done

        echo "PostgreSQL is ready!"
    fi

    echo "Running database migrations..."
    bun scripts/migrate.ts

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