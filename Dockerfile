# ============================================================================
# 依赖安装阶段（Debian / glibc / ARM 稳定）
# ============================================================================
FROM oven/bun:1 AS deps

WORKDIR /app

# 安装完整 native 构建工具链 + node-gyp（关键）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    node-gyp \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# Bun 缓存挂载（加速 CI）
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile

# ============================================================================
# 构建阶段（Debian / glibc）
# ============================================================================
FROM oven/bun:1 AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js build cache
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build

# ============================================================================
# 运行阶段（Alpine / 体积最小）
# ============================================================================
FROM oven/bun:1-alpine AS runner

# 运行期最小依赖
RUN apk add --no-cache \
    libc6-compat \
    tini \
    postgresql-client

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 非 root 用户
RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

# 数据目录
RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

# 拷贝必要的运行时文件
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 拷贝迁移相关文件和 node_modules（关键！包含 node-pg-migrate）
COPY --from=builder --chown=nextjs:nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nextjs /app/db.config.js ./db.config.js
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]