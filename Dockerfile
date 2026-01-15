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

# 只安装运行必需的系统包
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \                  # 进程管理，防止僵尸进程
    postgresql-client \     # 提供 pg_isready 命令
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 创建非 root 用户（安全最佳实践）
RUN useradd -r -u 1001 -s /sbin/nologin nextjs

# 可持久化数据目录（如果你有上传文件等需求）
RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

# 复制 Next.js standalone 输出（已包含 server.js 和核心依赖）
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 复制迁移脚本所需的源码和依赖描述文件
COPY --from=builder --chown=nextjs:nextjs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nextjs /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/bun.lock ./bun.lock 2>/dev/null || true

# 只安装生产依赖（关键：包含 postgres、drizzle-orm 等）
RUN bun install --production --frozen-lockfile || bun install --production

# 复制入口脚本并赋予执行权限
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["bun", "server.js"]