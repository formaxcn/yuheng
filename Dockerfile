# ============ 基础镜像 ============
FROM node:24-alpine AS base
# 禁用APK触发器执行以提高多架构兼容性
RUN apk add --no-cache --no-scripts libc6-compat
WORKDIR /app

# ============ 依赖安装 ============
FROM base AS deps
# Install build dependencies for better-sqlite3 and multi-arch support
RUN apk add --no-cache --no-scripts python3 make g++ gcc musl-dev
COPY package.json package-lock.json ./
# Use npm install with --arch flag support for multi-arch builds
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

# ============ 构建阶段 ============
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Set up environment for multi-arch builds
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============ 运行镜像（极致精简） ============
# ============ 运行镜像（极致精简） ============
FROM node:24-alpine AS runner

# 提前安装基础依赖，利用缓存
# better-sqlite3 运行时需要 libc6-compat
# tini 防止僵尸进程
# postgresql-client 用于 pg_isready 健康检查
RUN apk add --no-cache --no-scripts libc6-compat tini postgresql-client

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 使用官方推荐的非 root 用户
RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

# 数据持久化目录
RUN mkdir /app/data && chown nextjs /app/data
VOLUME /app/data

# 复制 standalone 运行所需全部文件（已包含精简的 node_modules 和 server.js）
COPY --from=builder --chown=nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs /app/public ./public

# 复制迁移文件和配置
COPY --from=builder --chown=nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs /app/db.config.js ./db.config.js
COPY --from=builder --chown=nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# 设置启动脚本可执行
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# 使用启动脚本作为入口点
ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]