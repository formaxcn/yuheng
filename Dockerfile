# ============================================================================
# 1. 依赖安装阶段
# ============================================================================
FROM oven/bun:1-slim AS deps

WORKDIR /app

# 安装构建必需的系统包
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    nodejs \
    npm \
    && npm install -g node-gyp \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# 使用 Bun 缓存加速安装
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile

# ============================================================================
# 2. 构建阶段
# ============================================================================
FROM oven/bun:1-slim AS builder

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js 构建
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build

# ============================================================================
# 3. 运行阶段
# ============================================================================
FROM oven/bun:1-slim AS runner

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

# 复制 Next.js standalone 内容
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 为迁移脚本准备运行环境
# standalone 模式下依赖在 node_modules，但迁移脚本需要 drizzle-orm 和 postgres
# 我们直接从 deps 阶段复制这几个必要的包
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps /app/node_modules/drizzle-kit ./node_modules/drizzle-kit

COPY --from=builder --chown=nextjs:nextjs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nextjs /app/scripts/migrate.ts ./scripts/migrate.ts

COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]
