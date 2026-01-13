# ============ 基础镜像 ============
FROM node:24-alpine AS base
RUN apk add --no-cache --no-scripts libc6-compat
WORKDIR /app

# ============ 依赖安装 ============
FROM base AS deps
# better-sqlite3 等 native 模块编译需要
RUN apk add --no-cache --no-scripts python3 make g++ gcc musl-dev

COPY package.json package-lock.json ./

# 使用 BuildKit 缓存加速 npm install（GitHub Actions gha 缓存会持久化）
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

# ============ 构建阶段 ============
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 缓存 Next.js build cache（极大加速后续构建）
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    npm run build

# ============ 运行镜像（极致精简） ============
FROM node:24-alpine AS runner

# 安装运行时依赖
# tini：防止僵尸进程
# postgresql16-client：提供 pg_isready、psql 等工具（Alpine 新版必须指定版本）
RUN apk add --no-cache --no-scripts \
    libc6-compat \
    tini \
    postgresql16-client

# 全局安装 node-pg-migrate 以确保迁移脚本可用
RUN npm install -g node-pg-migrate

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

# 数据目录
RUN mkdir /app/data && chown nextjs:nextjs /app/data
VOLUME /app/data

# 复制 standalone 所需文件
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# 迁移、配置、启动脚本
COPY --from=builder --chown=nextjs:nextjs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nextjs /app/db.config.js ./db.config.js
COPY --from=builder --chown=nextjs:nextjs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]