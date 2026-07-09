# Device-based Authentication - Implementation Notes

## Overview

为单用户模式实现设备级登录鉴权，支持 TOTP（2FA）和设备互信审批两种方式，无需密码。

## 核心改动

### 1. 数据库 Schema

新增两张表（PostgreSQL + SQLite 双适配）：

**`device_requests`** - 设备审批请求
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 自增主键 |
| user_id | UUID FK | 关联用户（默认 DEFAULT_USER_ID） |
| request_code | TEXT | 4字符内部标识码（不展示给用户） |
| device_name | TEXT | 设备名称（用户可选填写） |
| status | TEXT | pending / approved / denied / expired |
| created_at | TIMESTAMP | 创建时间 |
| resolved_at | TIMESTAMP | 处理时间 |

**`sessions`** - 设备信任会话
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | 自增主键 |
| user_id | UUID FK | 关联用户 |
| device_name | TEXT | 设备名称 |
| fingerprint | TEXT | 设备指纹（UUID，localStorage 生成） |
| created_at | TIMESTAMP | 创建时间 |
| last_active_at | TIMESTAMP | 最后活跃时间 |
| expires_at | TIMESTAMP | 过期时间（设为 2099-12-31，永不过期） |

迁移文件：
- PG: `drizzle/pg/0001_device_auth.sql`
- SQLite: `drizzle/sqlite/0001_device_auth.sql`

### 2. Auth 库代码

**`lib/auth/totp.ts`** - TOTP 服务
- 使用 `otplib` v13（`TOTP` class + `NobleCryptoPlugin` + `ScureBase32Plugin`）
- `generateSecret()` - 生成 Base32 密钥
- `buildOtpAuthUri(secret, label)` - 生成 otpauth:// URI
- `generateQrCode(uri)` - 生成 QR 码 data URL（`qrcode` 库）
- `verify(secret, token)` - 异步验证 TOTP 码
- `generateBackupCodes()` - 生成 8 个 8 字符备用码（排除易混淆字符）
- `hashBackupCodes(codes)` - bcrypt 哈希存储
- `verifyBackupCode(code, hashes)` - 验证并消费备用码

**`lib/auth/device-auth.ts`** - 设备审批服务
- `createRequest(deviceName)` - 创建待审批请求，返回 requestId
- `getRequestStatusById(requestId)` - 轮询请求状态
- `approveRequest(requestId)` - 批准请求（仅改状态，不创建会话）
- `denyRequest(requestId)` - 拒绝请求
- `createSessionFromApproval(requestId, fingerprint, deviceName)` - 审批通过后创建信任会话
- `createTrustedSession(fingerprint, deviceName)` - TOTP 登录直接创建会话
- `listSessions()` / `revokeSession(id)` - 会话管理
- 所有方法在关键节点都有 `[DeviceAuth]` 前缀的详细日志

**`lib/auth/session.ts`** - 会话管理（更新）
- Session 接口新增 `sessionId?` 和 `fingerprint?` 字段
- `createDeviceSession()` - 创建 DB-backed 长期会话 cookie（10年 maxAge）
- `get()` - 如果 session 有 sessionId，会查 DB 验证会话是否仍存在（支持远程撤销）
- `isExpired()` - 设备会话永不过期，多用户会话 1 天过期
- `getDeviceFingerprint()` - 从 `X-Device-FP` header 或 cookie 读取设备指纹

**`lib/auth/auth-service.ts`** - 认证服务（扩展）
- `isDeviceAuthEnabled()` / `enableDeviceAuth()` / `disableDeviceAuth()`
- `isTotpBound()` / `setupTotp()` / `confirmTotpSetup()` / `disableTotp()`
- `verifyTotpLogin(token, fingerprint, deviceName)` - TOTP 验证 + 创建会话

### 3. API 路由

| 路由 | 方法 | 鉴权 | 说明 |
|------|------|------|------|
| `/api/auth/totp/setup` | POST | 需要 | 生成 TOTP 密钥 + QR 码 + 备用码 |
| `/api/auth/totp/confirm` | POST | 需要 | 验证码确认绑定 TOTP |
| `/api/auth/totp/verify` | POST | 无 | TOTP 登录验证（新设备使用） |
| `/api/auth/totp/disable` | POST | 需要 | 禁用 TOTP |
| `/api/auth/device/enable` | POST | 需要 | 启用设备鉴权（自动信任当前设备） |
| `/api/auth/device/disable` | POST | 需要 | 禁用设备鉴权（清除所有会话） |
| `/api/auth/device/request` | POST | 无 | 新设备创建审批请求，返回 requestId |
| `/api/auth/device/status` | GET | 无 | 轮询请求状态，参数 `?requestId=N` |
| `/api/auth/device/list` | GET | 需要 | 列出待审批请求 + 活跃会话 |
| `/api/auth/device/approve` | POST | 需要 | 批准待审批请求 |
| `/api/auth/device/deny` | POST | 需要 | 拒绝待审批请求 |
| `/api/auth/device/session` | POST | 无 | 审批通过后新设备创建会话 |
| `/api/auth/device/revoke` | POST | 需要 | 撤销活跃会话（不能撤销当前会话） |

所有路由在关键节点都有 `[API:device/*]` 前缀的日志。

### 4. 前端

**`app/login/page.tsx`** - 登录页（重写）
- 多用户模式：用户选择器 + 密码登录（保持原逻辑）
- 设备鉴权模式：
  - TOTP tab：6 位验证码输入（支持备用码）
  - Device Approval tab：提交请求后显示 "Waiting for approval..." 等待界面
  - 通过 requestId 每 3 秒轮询状态
  - 不展示请求码给用户

**`components/auth/totp-setup.tsx`** - TOTP 绑定引导
- 显示 QR 码（扫码绑定 Authenticator App）
- 显示密钥（手动输入）
- 显示 8 个备用码（可复制）
- 验证 6 位码确认绑定

**`components/auth/session-manager.tsx`** - 会话管理
- 待审批请求列表（显示设备名 + 请求时间，✓ 批准 / ✗ 拒绝）
- 活跃会话列表（显示设备名 + 最后活跃时间，🗑 撤销）
- 不显示请求码和过期时间

**`lib/auth/auth-context.tsx`** - 认证上下文（扩展）
- 新增 15 个设备鉴权相关方法
- 客户端自动生成设备指纹（`crypto.randomUUID()`），存 localStorage
- 关键 API 调用附带 `X-Device-FP` header

**`components/auth-guard.tsx`** - 路由守卫（更新）
- 支持 `deviceAuthEnabled` 模式
- 设备鉴权启用且未认证时重定向到 /login

**`components/user-switcher.tsx`** - 用户菜单（更新）
- 设备鉴权模式下显示 Settings + Logout

**`app/settings/page.tsx`** - 设置页（更新）
- Advanced Options 中新增 Device Authorization 开关
- TOTP 管理区域（Setup / Disable）
- 内嵌 SessionManager 组件

### 5. i18n

`messages/en.json` 和 `messages/zh.json` 新增 `Auth` 翻译段。

### 6. 日志

在以下关键节点添加详细日志（使用 `lib/logger.ts`）：

| 位置 | 日志前缀 | 记录内容 |
|------|----------|----------|
| `DeviceAuthService.createRequest` | `[DeviceAuth] createRequest` | deviceName, requestCode, requestId |
| `DeviceAuthService.approveRequest` | `[DeviceAuth] approveRequest` | requestId, 当前状态, 设备名, 过期检查, 成功/失败 |
| `DeviceAuthService.denyRequest` | `[DeviceAuth] denyRequest` | requestId, 当前状态, 设备名, 成功/失败 |
| `DeviceAuthService.createSessionFromApproval` | `[DeviceAuth] createSessionFromApproval` | requestId, fingerprint(前8位), sessionId |
| `DeviceAuthService.createTrustedSession` | `[DeviceAuth] createTrustedSession` | deviceName, sessionId |
| `DeviceAuthService.revokeSession` | `[DeviceAuth] revokeSession` | sessionId |
| API: device/approve | `[API:device/approve]` | 请求体, 审批人, 结果 |
| API: device/deny | `[API:device/deny]` | 请求体, 拒绝人, 结果 |
| API: device/request | `[API:device/request]` | deviceName, requestId |
| API: device/session | `[API:device/session]` | requestId, fingerprint, sessionId, userName |
| API: device/status | `[API:device/status]` | 状态变化时记录（减少轮询噪音） |

### 7. 测试脚本

`scripts/test-device-auth.ts` - 端到端设备审批流程测试：
1. 创建设备请求 → 验证 pending
2. 轮询状态 → 验证 pending
3. 列出待审批 → 验证请求在列表中
4. 批准请求 → 验证 approved
5. 创建会话 → 验证 session 创建成功
6. 列出会话 → 验证会话存在
7. 重复批准 → 验证失败
8. 创建第二个请求并拒绝 → 验证 denied
9. 从已拒绝请求创建会话 → 验证失败
10. 撤销会话 → 验证会话已删除
11. 批准不存在的请求 → 验证失败

运行方式：`bun run scripts/test-device-auth.ts`（需要可用数据库连接）

## 与原设计的差异

基于实际实现中的反馈，对 ADR 2 设计做了以下调整：

| 原设计 | 实际实现 | 原因 |
|--------|----------|------|
| 请求码展示给用户，已登录设备输入码审批 | 请求码仅内部使用，请求直接出现在设置界面，点同意即可 | 用户体验更简单 |
| 信任会话 30/90 天过期 | 信任会话永不过期（expires_at = 2099-12-31） | 用户要求 |
| 轮询用 requestCode | 轮询用 requestId | 不展示码后用 ID 更直接 |
| `getDeviceRequestByCode` 查询 | `getDeviceRequest(id)` 查询 | 简化查询逻辑 |
| `expires_at > NOW()` 过滤 | 无过期过滤 | 会话永不过期 |
| Session fingerprint in localStorage only | Fingerprint 在 localStorage 生成，通过 header 传递，存入 session cookie | SSR 可用 |

## 依赖

- `otplib` v13 - TOTP 生成/验证（RFC 6238）
- `qrcode` - QR 码生成
- `bcryptjs` - 备用码哈希（已有依赖）
- `@types/qrcode` - 类型定义

## 文件清单

### 新增文件
```
lib/auth/totp.ts                                    # TOTP 服务
lib/auth/device-auth.ts                             # 设备审批服务
components/auth/totp-setup.tsx                      # TOTP 绑定组件
components/auth/session-manager.tsx                 # 会话管理组件
drizzle/pg/0001_device_auth.sql                     # PG 迁移
drizzle/sqlite/0001_device_auth.sql                 # SQLite 迁移
app/api/auth/totp/setup/route.ts                    # TOTP 设置 API
app/api/auth/totp/confirm/route.ts                  # TOTP 确认 API
app/api/auth/totp/verify/route.ts                   # TOTP 验证 API
app/api/auth/totp/disable/route.ts                  # TOTP 禁用 API
app/api/auth/device/enable/route.ts                 # 设备鉴权启用 API
app/api/auth/device/disable/route.ts                # 设备鉴权禁用 API
app/api/auth/device/request/route.ts                # 设备请求 API
app/api/auth/device/status/route.ts                 # 状态轮询 API
app/api/auth/device/list/route.ts                   # 列表 API
app/api/auth/device/approve/route.ts                # 批准 API
app/api/auth/device/deny/route.ts                   # 拒绝 API
app/api/auth/device/session/route.ts                # 会话创建 API
app/api/auth/device/revoke/route.ts                 # 撤销 API
scripts/test-device-auth.ts                         # 测试脚本
```

### 修改文件
```
lib/db/schema.ts                    # 新增 device_requests + sessions 表定义
lib/db/sqlite-schema.ts             # 同上（SQLite）
lib/db/types.ts                     # 新增 DeviceRequest + SessionRecord 类型
lib/db/interface.ts                 # 新增 12 个设备鉴权 DB 方法
lib/db/postgres.ts                  # 实现设备鉴权 PG 方法
lib/db/sqlite.ts                    # 实现设备鉴权 SQLite 方法
lib/auth/session.ts                 # 支持 DB-backed 设备会话
lib/auth/auth-service.ts            # 新增 TOTP + 设备鉴权方法
lib/auth/auth-context.tsx           # 新增 15 个前端方法
lib/utils.ts                        # 新增 formatDistanceToNow
components/auth-guard.tsx           # 支持设备鉴权模式
components/user-switcher.tsx        # 设备鉴权下显示登出
app/login/page.tsx                  # TOTP + 设备审批登录
app/settings/page.tsx               # 设备鉴权设置区域
app/api/auth/status/route.ts        # 返回设备鉴权状态
drizzle/pg/meta/_journal.json       # 迁移日志
drizzle/sqlite/meta/_journal.json   # 迁移日志
messages/en.json                    # Auth 翻译
messages/zh.json                    # Auth 翻译
```
