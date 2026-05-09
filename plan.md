# 玉衡 (YuHeng) 产品路线图 & 技术规划

> 最后更新：2026-05-09

---

## ✅ 已完成 - 代码质量优化

### 1. 消除重复常量定义
- 创建 `lib/constants.ts` 集中管理配置
- 移除 `lib/db.ts` 和 `lib/db/index.ts` 中重复的默认配置
- 提交：`refactor: eliminate duplicate constants`

### 2. 删除废弃代码
- 移除标记为 `@deprecated` 的 `processRecognition` 函数
- 提交：`refactor: remove deprecated processRecognition`

### 3. 类型安全改进
- 新增 `RecognizedDish` 类型用于 LLM 识别结果
- 替换关键路径的 `any` 类型（18+ 处）
- 修复 postgres adapter 返回类型
- 提交：`refactor: replace 'any' types in critical paths`

### 4. 导入路径标准化
- 统一 lib 目录内使用相对路径
- 提交：`refactor: standardize import paths`

### 5. 提取魔法数字
- 轮询间隔、重试延迟、单位换算系数全部具名化
- 新增 `lib/unit-conversion.ts` 单位转换工具函数
- 提交：`refactor: extract magic numbers and unit conversion`

---

## 📊 功能评估矩阵

已评估的功能优先级和可行性：

| 功能 | 合理性 | 优先级 | 实现难度 | 说明 |
|------|--------|--------|----------|------|
| 美食日历 | ✅ 极高 | P0 | 低 | 现有历史功能的自然扩展 |
| 膳食计划默认值 | ✅ 高 | P0 | 低 | 扩展现有 settings 框架 |
| PWA 支持 | ✅ 极高 | P1 | 中 | Next.js 内置支持 |
| 日历图片分享 | ✅ 高 | P1 | 中 | 前端生成，不需要后端存储 |
| 餐前餐后对比 | ✅ 极高 | P1 | 中 | 高价值用户洞察 |
| 血糖/血脂/尿酸模式 | ✅ 高 | P2 | 中 | 扩展 settings 评估维度 |
| 血糖风险评估 | ✅ 高 | P2 | 中高 | 需要碳水/GI 数据库 |
| 血脂/血管压力 | ✅ 高 | P2 | 中高 | 需要脂肪/胆固醇细分数据 |
| 嘌呤风险 | ✅ 高 | P2 | 中高 | 针对痛风人群 |
| 肝脏风险 | ⚠️ 中 | P3 | 高 | 需要医学模型，建议谨慎 |
| 多用户支持 | ⚠️ 低 | P3 | 高 | 暂缓完整实现，仅做架构预埋 |

---

## 🏗️ 架构决策记录

### 决策 1：日历图片存储 - 无需 S3/MinIO

**结论：前端生成 + 前端消费**

```
用户点击"分享" → html2canvas 生成图片 → 用户保存/分享 → 图片丢弃
```

**理由：**
1. 分享图片是"生成即消费"模式，不需要持久化
2. 前端 html2canvas/satori 完全满足需求
3. 零存储成本，零网络开销
4. 未来如需短链接分享，PostgreSQL bytea + TTL 足够
5. S3/MinIO 等用户量达到 10 万+ 再考虑

**实施计划：**
- 安装 `html2canvas`
- 创建 `components/calendar/ShareButton.tsx`

---

### 决策 2：多用户支持 - 渐进式架构预埋

**结论：现在加 user_id 列，暂缓完整认证系统**

**Step 1: 架构预埋（本周可做）**
```sql
-- 所有表加 user_id 列，默认值为系统用户
ALTER TABLE recipes ADD COLUMN user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE entries ADD COLUMN user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE dishes ADD COLUMN user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE settings ADD COLUMN user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE recognition_tasks ADD COLUMN user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
```

**Step 2: DB 层自动注入用户上下文**
```typescript
// lib/db/context.ts
export class UserContext {
    private static userId: string = '00000000-0000-0000-0000-000000000000';
    static set(id: string) { this.userId = id; }
    static get() { return this.userId; }
}

// postgres adapter 查询自动带上 user_id 过滤
```

**Step 3: 完整多用户（产品验证后）**
- 日活 > 100
- 有付费用户询问团队版
- 核心功能稳定

**理由：**
- 现在加 user_id 成本极低（1 天工作量）
- 完整认证系统需要 2-3 周重构，影响新功能开发
- 本地优先定位决定了单用户是主流场景
- 家庭共享用"导出/导入配置"轻量方式即可满足

---

## 🎯 实施路线图

### Phase 0: 架构预埋（1 天，立即开始）

- [ ] 所有数据库表加 user_id 列
- [ ] drizzle schema 更新
- [ ] 创建 `UserContext` 类
- [ ] postgres adapter 自动注入 user_id 过滤

### Phase 1: 低难度高价值（1-2 周）

- [ ] **美食日历视图**
  - 基于现有 `getHistory` API
  - 日历网格组件，显示每日卡路里
  - 点击日期查看详情

- [ ] **膳食计划默认值**
  - 新增预设模板：增肌/减脂/维持/低碳
  - settings 表增加 `default_meal_plan`
  - 新用户引导时选择目标

- [ ] **健康模式开关**
  - settings 增加 `health_focus: general | glycemic | lipid | purine`
  - UI 根据模式突出对应营养指标

### Phase 2: 中等难度（2-3 周）

- [ ] **PWA 支持**
  - `public/manifest.json` 配置
  - `next.config.ts` 启用 PWA
  - Service Worker 离线数据缓存策略

- [ ] **日历图片分享**
  - 安装 `html2canvas`
  - `ShareButton` 组件
  - 支持微信朋友圈尺寸 (1080x1920)
  - 水印和品牌信息

- [ ] **餐前餐后对比**
  - 拍照时增加 "餐前" 标记
  - 餐后补充实际感受/血糖数据
  - 生成对比报告（预测 vs 实际）

### Phase 3: 健康风险评估（长期规划）

- [ ] 血糖风险评估模型（需要 GI 数据库）
- [ ] 血脂/血管压力评估
- [ ] 嘌呤风险评估（需要嘌呤数据库）
- [ ] 免责声明系统

---

## 📁 代码组织规划

```
lib/
├── constants.ts          ✓ 已创建
├── unit-conversion.ts    ✓ 已创建
├── db/context.ts         ← Phase 0 新增
└── health/               ← Phase 3 新增
    ├── glycemic.ts       # 血糖评估
    ├── lipid.ts          # 血脂评估
    └── purine.ts         # 嘌呤评估

components/
├── calendar/             ← Phase 1 新增
│   ├── CalendarGrid.tsx
│   ├── DayCell.tsx
│   └── ShareButton.tsx   ← Phase 2
├── health/               ← Phase 3 新增
│   ├── RiskIndicator.tsx
│   └── ReportCard.tsx
└── meal-plans/           ← Phase 1 新增
    └── PresetSelector.tsx
```

---

## ⚠️ 注意事项

### 健康风险类功能
- **必须**增加明确的免责声明："本评估仅供参考，不构成医疗诊断"
- 建议引用权威机构来源（WHO、中国营养学会等）
- 避免"诊断"、"治疗"等医疗术语，使用"风险提示"、"参考建议"

### 数据迁移
- 加 user_id 列时注意设置默认值，避免现有数据变成孤儿
- 未来迁移真实用户时需要数据归属策略

---

## 📝 待讨论

- [ ] 健康风险评估的数据源选择（开源 vs 付费 API）
- [ ] PWA 离线缓存策略（哪些数据需要离线可用）
- [ ] 餐前餐后对比的数据模型设计
