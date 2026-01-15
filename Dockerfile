# ============================================================================
# 依赖安装阶段
# ============================================================================
FROM oven/bun:1-slim AS deps

WORKDIR /app

# 安装 native 构建工具链
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    node-gyp \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# Bun 缓存挂载（加速 CI）
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile

# ============================================================================
# 构建阶段
# ============================================================================
FROM oven/bun:1-slim AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js build cache
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build

# ============================================================================
# 运行阶段（使用 slim 保持 glibc 兼容性）
# ============================================================================
FROM oven/bun:1-slim AS runner

# 运行期最小依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 非 root 用户
RUN useradd -r -u 1001 -s /sbin/nologin nextjs

# 数据目录
RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

# 拷贝必要的运行时文件 (standalone 已包含最小依赖)
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 拷贝迁移相关文件
COPY --from=builder --chown=nextjs:nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# 复制迁移所需的依赖（node-pg-migrate + pg 及其依赖）
# 从 builder 复制而非重新安装，避免在 runner 阶段需要构建工具
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/node-pg-migrate ./node_modules/node-pg-migrate
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/pg ./node_modules/pg
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/pg-* ./node_modules/
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/.bin/node-pg-migrate ./node_modules/.bin/node-pg-migrate

RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]