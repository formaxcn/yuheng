# ============ 基础镜像 ============
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ============ 依赖安装 ============
FROM base AS deps
# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============ 构建阶段 ============
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============ 运行镜像（极致精简） ============
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    DB_PATH="/app/data/nutrition.db"

# better-sqlite3 运行时需要 + tini 防止僵尸进程（仅 15KB）
RUN apk add --no-cache libc6-compat tini

# 使用官方推荐的非 root 用户
RUN adduser -D -H -u 1001 -s /sbin/nologin nextjs

# 数据持久化目录
RUN mkdir /app/data && chown nextjs /app/data
VOLUME /app/data

# 复制 standalone 运行所需全部文件（已包含精简的 node_modules 和 server.js）
COPY --from=builder --chown=nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs /app/public ./public

USER nextjs
EXPOSE 3000

# tini 做 PID1 + 直接运行 node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]