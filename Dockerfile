# ============================================================================
# 1. 依赖安装阶段
# ============================================================================
FROM oven/bun:1-slim AS deps

WORKDIR /app

COPY package.json bun.lock ./

# 快速路径:优先使用预编译二进制(better-sqlite3 v12 提供 node-v137 的 linux x64/arm64 预编译)
# 失败时回退到安装编译工具链并从源码编译
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile || \
    (echo ">> Prebuilt download failed, falling back to source compilation..." && \
     apt-get -o Acquire::Retries=10 update && \
     apt-get -o Acquire::Retries=10 install -y --no-install-recommends \
       build-essential python3 nodejs npm && \
     npm install -g node-gyp@10.2.0 && \
     rm -rf /var/lib/apt/lists/* && \
     bun install --frozen-lockfile)

# ============================================================================
# 2. 构建阶段
# ============================================================================
FROM oven/bun:1-slim AS builder

ARG GITHUB_SHA
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    GITHUB_SHA=${GITHUB_SHA} \
    BUILD=true

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
# standalone 模式下依赖在 node_modules，但迁移脚本需要 drizzle-orm, postgres, better-sqlite3
# 我们直接从 deps 阶段复制这几个必要的包
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=deps /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

COPY --from=builder --chown=nextjs:nextjs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nextjs /app/scripts/migrate.ts ./scripts/migrate.ts

COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]
