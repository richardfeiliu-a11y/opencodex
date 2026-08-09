---
title: Usage Analytics Phase 1 审查回复
date: 2026-08-08
category: reports
status: active
related: ["usage-analytics-phase1-research-prompt-2026-08-08.md", "usage-analytics-phase1-research-report-2026-08-08.md"]
---

# 审查意见回复(Phase 1 报告修订说明)

> 本文件是对独立审查 agent 意见的逐项回复,附核实证据与修订位置。
> 审查依据:研究报告 `opencodex_usage_analytics_phase1_research_report.md`。
> 回复时间:2026-08-08。

---

## 总述

审查 agent 提出 6 项发现(P1×2、P2×3、P3×1),全部经本机源码与上游仓库逐一核实,确认属实并已修订进报告。其中 **P2-4(版本漂移)核实后比审查描述更严重**:上游 main HEAD(8a9c0ef,version=2.10.0)与 v2.11.0 已分叉、互不为祖先,HEAD 这条更旧的分叉线**从未引入 `/api/request-history` 全套实现**。修订详情如下。

---

## 逐项回复

### P1-1:口径 A 分母定义自相矛盾 → 已修订(§10.4)

**确认属实**。核实 `src/usage/summary.ts` `addTokens()`:输入累加全集、缓存读只累加有 `cacheReadInputTokens` 字段的行(真实覆盖率 27%,§3.3)。原稿"分母只计有缓存字段的请求"与"公式 `cacheRead/inputTokens`"确实冲突。

**修订**:§10.4 将口径 A 拆为两个明确口径:

| 口径 | 公式 | 说明 |
|---|---|---|
| A1 全集 | `ΣcacheRead / ΣinputTokens`(全部有 usage 的行) | 受 73% 无缓存字段请求稀释,需标注覆盖率 |
| **A2 条件子集(推荐)** | `ΣcacheRead / ΣinputTokens(仅有 cacheRead 字段的行)` | 分母分子同一集合,可复现 |
| B | `cacheRead / (cacheRead + cacheWrite)` | 偏乐观,不推荐作主口径 |

"数据来源"段已改写为与公式一致,并注明 A1/A2 在单测中必须分别锁定。**待用户确认后定死默认口径并锁定单测**。

---

### P1-2:provider/model 过滤语义与 indexer 不一致 → 已修订(§8.3、§15 风险 5)

**确认属实**。核实 `src/routing/history/indexer.ts`:

- `queryRows()` 中 `provider = ?`、`model = ?` 作用在 `requests` 表的顶层列(`entry.provider` / `entry.model`);
- `extractRow()` 把 attempts 只写入 `attempt_count` 与 `row_json`,不参与列表过滤;
- `finalAttemptTarget()`(取最后 attempt)只在 `request-history-routes.ts` 的 `/route-decision` 详情端点使用。

即 **indexer 是顶层精确匹配,不含 attempts**。原稿 §8.3 写"provider 顶层或 attempt"确为错误。

**修订**:§8.3 方案 A 的过滤谓词改为"**顶层精确匹配(entry.provider / entry.model),不含 attempts**,与 indexer 对齐";§15 风险 5 同步改正。这保证 `/api/usage` 与 `/api/request-history` 在同一过滤下计数一致(§9.3 一致性规则)。

---

### P2-3:构建命令漏 gui 独立依赖 → 已修订(§15.5 步骤 2)

**确认属实**。核实 npm 包内 `gui/` 只有 `dist/`,无 `gui/package.json`、无 `gui/node_modules`;`build:gui` 脚本内部执行 `cd gui && bun install --frozen-lockfile && bun run build`。

**修订**:§15.5 步骤 2 显式拆出:

```bash
bun install --frozen-lockfile      # 后端依赖
cd gui && bun install --frozen-lockfile   # 前端依赖(React/Vite/Tailwind),独立一套
bun run build:gui
```

并提示首次克隆后 `gui/node_modules` 缺失、网络或原生依赖(如 esbuild)失败会中断构建。

---

### P2-4:npm 2.11.0 与上游 HEAD 版本漂移 → 已修订(§15 风险 5b、§15.5、§17),且比审查描述更严重

**确认属实,且严重程度升级(提交关系表述已按复核修正)**。实测上游仓库:

```text
origin/main HEAD    = 8a9c0ef  Revert "Merge branch 'main' ... into fab/00-agent-fabric",package.json version = 2.10.0
v2.11.0             = e3b2d6e  release: v2.11.0,package.json version = 2.11.0
两者关系            = 已分叉(merge-base 为 v2.11.0 自身),互不为祖先
src/routing/        = v2.11.0 有完整 history/(cursor/indexer/schema);origin/main 上不存在
```

关键:origin/main 是**比 v2.11.0 更旧(2.10.0)、功能缺失的分叉线**,其源码树**从未包含** `src/routing/` 整套(`history/cursor.ts`、`history/indexer.ts`、`history/schema.ts` 等)与 `src/server/management/request-history-routes.ts`;`management-api.ts` 也不引用它。**注意不是"HEAD 删除了 2.11.0 的 routing",而是"HEAD 这条分叉线从未引入 2.11.0 的 routing"**——两者归因不同:误信"领先 670 提交"而 rebase 到 HEAD,会直接丢失 request-history 全套能力。

**后果**:npm 包(2.11.0)有 `/api/request-history` 全套;上游 main HEAD 上**不存在该 API**。报告 §5/§8 的"request-history 已有 12 种过滤、只差 GUI 接线"前提,在 HEAD 上不成立。

**修订**:§15 风险表新增 5b(版本漂移,高严重度);§15.5 步骤 1 新增"版本对齐"子步骤:

```bash
git checkout v2.11.0        # 或 v2.11.0-preview.20260808,先对齐运行中的 npm 2.11.0
git diff v2.11.0 HEAD -- src/usage/summary.ts src/server/management/logs-usage-routes.ts
# 确认 /api/usage 过滤缺口是否仍存在;再决定方案 A 是否仍需要,以及是否跟随 HEAD 重构
```

§17 检查清单首条改为"版本对齐:checkout v2.11.0,diff 确认缺口"。

---

### P2-5:测试计划缺"过滤联动一致性"断言 → 已修订(§14.2b)

**确认属实**。原 §14 只测单端点过滤,暴露不了两端谓词漂移。

**修订**:新增 §14.2b,要求:

- 构造含 fallback/attempts 的数据集(部分请求 provider 只在 attempts、顶层不同);
- 断言同一 provider/model/status/from/to 过滤下,`/api/usage` 的 `summary.requests` == `/api/request-history` 全量行数(cursor 翻完或与 `index.indexedRows` 交叉校验);
- 测试放路由层(而非仅单元层),因为不一致源自两端过滤谓词实现差异。

---

### P3-6:遗漏第三个格式化函数 Ut() → 已修订(§4.2、§13.2、§17)

**确认属实**。在 `gui/dist/assets/index-BynIEIV-.js` 中核实到:

```js
function Ht(e){return e.replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1')}
// Ut(): e<1e4 ? String(e) : e<1e6 ? `${Ht((e/1e3).toFixed(1))}K`
//        : e<1e9 ? `${Ht((e/1e6).toFixed(1))}M`
//        : e<0xe8d4a51000 ? `${Ht((e/1e9).toFixed(1))}B` : `${Ht((e/0xe8d4a51000).toFixed(1))}T`
```

`Ut()` 阈值 1e4、大写 K/M/B/T、1 位小数,与 `br()`(小写 k、1e3)是独立路径。

**修订**:§4.2 补 `Ut()` 说明;§13.2 格式化层明确"**所有 toFixed+K/M/B/T 路径统一收敛到新组件(含 Ut() 的 1e4 阈值路径),而非只改 br()**";§17 清单同步。

---

## 附带结论(审查确认,未修改方案)

- **方案 A 仍是最小后端路径**:给 `/api/usage` 加过滤参数 + 缓存 key 扩展,三选一取舍合理,无更简单绕过路径。
- **PR 拆分口径已对齐**:§16 Include 与 Implementation Sequence 统一为"后端过滤参数"与"格式化层"两个独立可 review 的 PR。

---

## 供审查 agent 复核的修订位置索引

| 发现 | 报告修订位置 |
|---|---|
| P1-1 口径 | `## 10.4 缓存命中率指标`(A1/A2 拆分、决策点、数据来源) |
| P1-2 过滤语义 | `## 8. Backend-Change Decision`(8.3 方案 A)、`## 15. Risks`(风险 5) |
| P2-3 构建 | `## 15.5 Phase 2 落地前置条件`(步骤 2) |
| P2-4 版本漂移 | `## 15. Risks`(风险 5b)、`## 15.5`(步骤 1)、`## 17. Implementation Checklist` |
| P2-5 一致性断言 | `## 14. Testing Plan`(14.2b) |
| P3-6 Ut() | `## 4. Current OpenCodex GUI Limitations`(4.2)、`## 13`(13.2)、`## 17` |
| 全部汇总 | `## 审查修订记录`(报告末尾) |
