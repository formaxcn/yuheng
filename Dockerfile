# ============ 依赖安装阶段（用 debian 版，工具齐全） ============
FROM oven/bun:1 AS deps

WORKDIR /app

# debian-slim 自带 python3、make、g++ 等，几乎无需额外安装
# 如果有特殊 native 模块需求，再补几个包即可
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

# Bun 缓存挂载
RUN --mount=type=cache,id=bun-cache,target=/root/.bun \
    bun install --frozen-lockfile

# ============ 构建阶段（同样用 debian 版） ============
FROM oven/bun:1 AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js build 缓存
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    bun run build

# 可选：检查 standalone 输出完整性
# RUN test -f .next/standalone/server.js || (echo "server.js missing!" && exit 1)

# ============ 运行阶段（极致精简 alpine 版） ============
FROM oven/bun:1-alpine AS runner

# 运行时所需包
RUN apk add --no-cache \
    libc6-compat \
    tini \
    postgresql-client  # 自动最新版 pg_isready 等

# 全局安装迁移工具
RUN bun add -g node-pg-migrate

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 非 root 用户
RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

# 复制 standalone 输出
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 脚本和配置
COPY --from=builder --chown=nextjs:nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nextjs /app/db.config.js ./db.config.js
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]