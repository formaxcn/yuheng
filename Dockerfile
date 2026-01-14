# ============ 依赖安装阶段（用 debian 版，安装完整构建工具） ============
FROM oven/bun:1 AS deps

WORKDIR /app

# 安装 build-essential（包含 gcc g++ make dpkg-dev libc6-dev 等一切 node-gyp 需要的东西）
# 加上 python3（node-gyp 明确需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# Bun 缓存挂载
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile

# ============ 构建阶段 ============
FROM oven/bun:1 AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js build 缓存
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build

# ============ 运行阶段（极致精简 alpine 版） ============
FROM oven/bun:1-alpine AS runner

RUN apk add --no-cache \
    libc6-compat \
    tini \
    postgresql-client

RUN bun add -g node-pg-migrate

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nextjs /app/db.config.js ./db.config.js
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]