#!/bin/sh
set -e

echo "Starting YuHeng container..."

if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."

    # 动态查找 pg_isready 的实际路径（兼容 Alpine 不同版本和架构）
    # 常见路径：
    #   /usr/libexec/postgresql16/pg_isready     ← 你当前 arm64 环境
    #   /usr/lib/postgresql16/bin/pg_isready     ← 部分旧版本
    #   /usr/bin/pg_isready                      ← 极少数情况或未来可能
    PG_ISREADY=$(find /usr -type f -name pg_isready -executable 2>/dev/null | head -n1)

    if [ -z "$PG_ISREADY" ]; then
        echo "ERROR: pg_isready not found in container. Cannot wait for database."
        echo "Falling back to simple port check using nc (netcat)."
        # 使用 nc 检查端口（Alpine 基础镜像自带，零依赖）
        until nc -z "${POSTGRES_HOST:-postgres}" 5432 >/dev/null 2>&1; do
            echo "PostgreSQL port 5432 not ready yet - sleeping 1s"
            sleep 1
        done
    else
        echo "Found pg_isready at: $PG_ISREADY"
        # 使用找到的 pg_isready，-d 参数支持完整 URL
        until "$PG_ISREADY" -d "$DATABASE_URL" >/dev/null 2>&1; do
            echo "PostgreSQL is not ready yet - sleeping 1s"
            sleep 1
        done
    fi

    echo "PostgreSQL is ready!"

    echo "Running database migrations..."
    node-pg-migrate up --config db.config.js

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