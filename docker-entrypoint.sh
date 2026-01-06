#!/bin/sh
set -e

echo "Starting YuHeng container..."

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."
    
    while ! pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; do
        echo "PostgreSQL is not ready yet - sleeping"
        sleep 1
    done
    
    echo "PostgreSQL is ready!"
    
    echo "Running database migrations..."
    npm run db:migrate
    
    if [ $? -eq 0 ]; then
        echo "Migrations completed successfully!"
    else
        echo "Migration failed!"
        exit 1
    fi
else
    echo "WARNING: DATABASE_URL not set. Skipping migrations."
fi

echo "Starting application..."
exec "$@"
