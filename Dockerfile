# ============================================================================
# 1. 依赖安装阶段（只安装所有依赖，用于构建）
# ============================================================================
FROM oven/bun:1-slim AS deps

WORKDIR /app

# 某些包（如 pg）可能需要编译工具，虽然你主要用 postgres，但保留以防万一
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
# 如果有 bun.lock，就复制（没有也不报错）
COPY bun.lock ./ 2>/dev/null || true

# 使用 Bun 缓存加速安装
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile || bun install

# ============================================================================
# 2. 构建阶段（Next.js 构建）
# ============================================================================
FROM oven/bun:1-slim AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 构建（带缓存加速）
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build
# ============================================================================
# 3. 运行阶段（最小化镜像）
# ============================================================================
FROM oven/bun:1-slim AS runner

# 运行时必需系统包
# - tini: 进程管理器，避免僵尸进程
# - postgresql-client: 提供 pg_isready 命令用于等待 DB 就绪
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN useradd -r -u 1001 -s /sbin/nologin nextjs

RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

COPY --from=builder --chown=nextjs:nextjs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nextjs /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/bun.lock ./bun.lock 2>/dev/null || true

RUN bun install --production --frozen-lockfile || bun install --production

COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]