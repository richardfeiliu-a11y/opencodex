---
title: Usage Analytics Phase 1 研究报告
date: 2026-08-08
category: reports
status: active
related: ["usage-analytics-phase1-research-prompt-2026-08-08.md", "usage-analytics-phase1-research-review-response-2026-08-08.md", "usage-analytics-completion-2026-08-09.md"]
---

# OpenCodex Usage Analytics — Phase 1 Research Report

> 依据 `opencodex_usage_analytics_phase1_research_prompt.md` 执行的研究报告(Phase 1,研究阶段)。
> 本阶段仅研究,不修改任何源代码。

---

## 0. 研究环境说明(重要前提)

### 0.1 执行环境

| 项目 | 值 |
|---|---|
| 执行时间 | 2026-08-08(本地时区 Europe/Berlin) |
| 用户主目录 | `/Users/fei` |
| 操作系统 | macOS |
| 当前工作区 | `/Users/fei/projects/Opencodex`(本报告与该研究提示文档所在目录) |

### 0.2 研究提示假设路径 vs 本机实际状态

研究提示假设工作区为 `~/Projects/opencodex-dev` + `../cc-switch` 两个源码仓库。**该假设在本机不成立**:

| 假设路径 | 实际状态 |
|---|---|
| `~/Projects/opencodex-dev` | 不存在(`~/Projects` 下无此目录) |
| `~/Projects/cc-switch` | 不存在 |
| 当前工作区 `/Users/fei/projects/Opencodex` | 仅有研究提示文档 + 本报告,非 git 仓库 |

> 结论:无法按提示直接在两个源码仓库中作业。研究改以**本机真实运行数据 + 已安装 npm 包中的完整后端源码 + GUI 编译产物逆向**进行,证据链在 §0.3~§0.5 完整列出。

### 0.3 实际研究材料清单(精确地址)

#### A. OpenCodex 后端源码(完整 TypeScript)

| 绝对路径 | 内容 |
|---|---|
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/src/` | 完整后端源码(Bun 原生 TS,13 个一级子目录) |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/src/usage/` | usage 核心:log / summary / totals / cost / debug / expected-prices |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/src/server/management/` | management API 各路由(23 个文件) |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/src/routing/history/` | request-history 索引:indexer / cursor / schema |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/src/AGENTS.md` | 源码运行时与仓库规则(本报告 §2 依据) |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/package.json` | 版本 2.11.0、脚本、依赖、上游仓库地址 |

#### B. OpenCodex GUI 编译产物(无源码,逆向依据)

| 绝对路径 | 内容 |
|---|---|
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/gui/dist/index.html` | SPA 入口 |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/gui/dist/assets/index-BynIEIV-.js` | React 生产构建(1.63MB,minified);含格式化函数 `br()` / `Df()` / `Sr()`、全部 i18n 文案、API 调用串 |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/gui/dist/assets/index-Bk-PN-70.css` | 样式(169KB);含组件类名(usage-cards / usage-filters / usage-workspace-* / logs-table / heatmap-cell-*) |
| `/Users/fei/.hermes/node/lib/node_modules/@bitkyc08/opencodex/gui/dist/provider-icons/` | Provider 图标(38 个 SVG) |

#### C. OpenCodex 运行数据(真实使用证据)

| 绝对路径 | 规模 | 内容 |
|---|---|---|
| `/Users/fei/.opencodex/usage.jsonl` | 5.6MB,4908 条(2026-08-07 05:32 ~ 2026-08-08 22:27) | 规范 usage 记录;字段覆盖统计见 §3.3 |
| `/Users/fei/.opencodex/routing-history.sqlite` | 7.6MB(含 WAL) | request-history 派生索引,与 indexer 代码对应 |
| `/Users/fei/.opencodex/config.json` | 36KB | 运行配置(managementUsageMaxReadBytes 等引用处) |

#### D. CC Switch 运行数据(闭源应用,仅有数据)

| 绝对路径 | 规模 | 内容 |
|---|---|---|
| `/Users/fei/.cc-switch/cc-switch.db` | 30MB,46292 条 `proxy_request_logs` + 93 行 `usage_daily_rollups` | 真实请求/日汇总数据;字段含 cost(字符串存储) |
| `/Users/fei/.cc-switch/settings.json` | 1.4KB | `usageDashboardRefreshIntervalMs: 5000`、`language: zh` 等 |
| `/Users/fei/.cc-switch/model-pricing.json` | 263B | 定价(极小,与 OpenCodex expected-prices 对应) |

#### E. 上游仓库(未克隆,后续 Phase 2 需访问)

| 地址 | 说明 |
|---|---|
| `https://github.com/lidge-jun/opencodex.git` | README 与 package.json 声明的官方仓库;GUI 源码、tests/、scripts/、docs-site/、根 AGENTS.md、CONTRIBUTING.md 仅在此 |

### 0.4 本报告各节与材料的对应关系

| 章节 | 主要依据材料 |
|---|---|
| §2 仓库约束 | `package.json`、`src/AGENTS.md` |
| §3 后端架构 | `src/usage/*`、`src/server/request-log.ts`、`src/server/management/*` |
| §4 GUI 现状 | `gui/dist/assets/index-*.js`(逆向)、`index-*.css` |
| §5 能力矩阵 | `src/routing/history/*`、`src/server/management/request-history-routes.ts`、`src/server/management/shared.ts` |
| §6 CC Switch 前端 | `~/.cc-switch/cc-switch.db`(schema 反推,无前端源码) |
| §3.3 真实数据验证 | `~/.opencodex/usage.jsonl`(统计脚本) |

### 0.5 材料局限与推断标注

- **GUI 无源码**:npm 包只发布 `gui/dist` 编译产物。所有 GUI 结论来自编译产物逆向,精确到函数与类名,但文件级路径(`gui/src/...`)需 Phase 2 克隆上游后校准(见 §15 风险 1)。
- **CC Switch 无源码**:闭源 WebKit 桌面应用(`com.ccswitch.desktop`),本机无可读前端资源。§6 中"数据契约"为数据库结构实证,"信息架构"为推断,均已标注。
- **仓库级规则不完整**:根 `AGENTS.md`、`CONTRIBUTING.md`、`structure/` 文档、GUI 测试约定不在 npm 包内,§2.2 列出需复核项。

---

## 1. Executive Summary

OpenCodex(本机安装 `@bitkyc08/opencodex@2.11.0`)已经具备研究提示想要的大多数底层能力,缺的主要是 **GUI 层的暴露方式**:

- **后端已完备**:`usage.jsonl` 是规范数据源;`/api/usage` 提供带 range/surface 过滤的汇总(总数、日序列、Provider/Model breakdown、估算成本);`/api/request-history` 是 2026 年新增的 keyset 游标分页请求历史 API,支持 provider / model / requestedModel / status / conversationId / surface / inboundProtocol / apiKeyId / profileId / fallback / from / to 十二种过滤,底层是 SQLite 派生索引(`routing-history.sqlite`),可增量追加、损坏自动重建。
- **GUI 现状落后于后端**:Usage 页只有 `7d / 30d / All` 三段式 range 切换 + surface 过滤,无 Provider/Model/Status 过滤,无时间区间选择,无趋势折线图(只有按天热度图 heatmap),无请求明细表。**`/api/request-history` 尚未被 GUI 调用**(编译产物中仅出现 `api/logs` 与 `api/usage`)。
- **数字格式化确有精度问题**:GUI 的 `br()` 格式化函数对 ≥1000 使用 `1.0k` 风格(1 位小数,去尾零),≥100M 显示为 `128.4M`,精确整数值在 UI 上不可达(无 tooltip、无原始值暴露)。另有 `Df()` 更粗(直接 `Math.round(e/1e3)+"k"`)。
- **后端改动评估:PARTIALLY**。P0 中"时间区间过滤(任意 from/to)、Status 过滤"前端可直接用 `/api/request-history` 实现;但"Summary 与过滤器保持一致 + token 趋势"是真正的缺口——`/api/usage` 只接受 `range=7d|30d|all` 与 `surface`,**不接受 provider/model/status/from/to 过滤,也不返回与过滤条件一致的汇总**。前端不能把"当前页合计"冒充"过滤后总计"(会把游标分页的结果误当全集),因此需要最小后端扩展(见 §8)。
- **推荐首个 PR 范围**:精确数字格式化 + 请求历史明细表(全过滤)+ 时间/Provider/Model/Status 过滤 + 后端聚合过滤参数 + token 趋势。成本/费用相关 UI 已存在但不属于本任务。

---

## 2. Repository Constraints

### 2.1 本机可验证的规则(`src/AGENTS.md` + `package.json`)

| 规则 | 内容 | 来源 |
|---|---|---|
| 运行时 | `src/` 是 Bun 原生 TypeScript,严格模式,仅 ESM;无独立编译步骤 | `src/AGENTS.md` |
| 依赖原则 | 优先 Bun 与 Web 平台 API;只有明确兼容需求才引入 Node-only 依赖 | `src/AGENTS.md` |
| 公开导出 | 除非任务明确要求,保持既有 public exports 与配置兼容 | `src/AGENTS.md` |
| 子系统边界 | 遵循既有边界与命名模式;不把无关职责合并成大模块 | `src/AGENTS.md` |
| 失败处理 | 在 request/transport/sidecar 边界处理异步失败;可选集成必须走既有失败表示,不得让请求路径崩溃 | `src/AGENTS.md` |
| Provider 元数据 | 属于 canonical provider registry,不得在独立 picker/seed 重复 | `src/AGENTS.md` |
| 安全边界 | 认证、OAuth、token、凭据、management API、CORS 变更 = security-boundary 变更 | `src/AGENTS.md` |
| 测试 | 聚焦行为跑 `bun test tests/<name>.test.ts` + `bun run typecheck`;共享路由/适配器/config/OAuth/server 行为跑 `bun run test`;涉及日志/请求/凭据/账户/fixture 跑 `bun run privacy:scan` | `src/AGENTS.md` |
| 文档 | 影响用户可见行为或配置时更新 `docs-site/` | `src/AGENTS.md` |
| GUI 构建 | `bun run build:gui`(`cd gui && bun install --frozen-lockfile && bun run build && cd .. && bun run prepare:package`) | `package.json` |
| GUI lint | `bun run lint:gui`(`cd gui && bun run lint`);prepush 用 `lint:gui:if-changed` | `package.json` |
| GUI doctor | `bun run doctor:gui` / `doctor:gui:full` / `doctor:gui:if-changed` | `package.json` |
| 发布前 | `prepublishOnly = audit:high + typecheck + build:gui` | `package.json` |
| 依赖管理 | Bun;`bun install --frozen-lockfile` | `package.json` / README |

### 2.2 需在真实克隆仓库复核的规则(不在 npm 包内)

- 根 `AGENTS.md` 的仓库级规则(目标分支、PR 模板、截图要求)。
- `gui/AGENTS.md`、测试目录规则、`structure/` 文档(变更共享路由/适配器/传输/sidecar/认证/配置/服务器架构前必须先读)。
- `CONTRIBUTING.md`(README 引用)。
- GUI 的包管理器与 lint 命令细节(仅知道 `bun run lint`、`bun run build`、`bun run doctor` 这些别名)。
- 上游是否有 Usage/Logs 相关测试文件、测试约定(编译产物不含测试)。

> 建议:Phase 2 开始前先把上游仓库克隆到本机,再核对上述规则;本报告其余部分基于 npm 包内容,结论不受该核对影响(后端源码即 npm 包内容)。

---

## 3. Current OpenCodex Usage Architecture

### 3.1 数据流(现状)

```text
usage.jsonl (canonical ledger, append-only)
   ├── /api/usage            ← readUsageSnapshotForManagement() 读尾部 ≤64MB
   │        └── summarizeUsage() → { summary, days, models, providers }
   ├── /api/request-history  ← routing-history.sqlite (derived index, rebuildable)
   │        └── queryRequestHistory() → keyset pages
   └── /api/logs             ← in-memory ring buffer (requestLog), 非持久
```

### 3.2 关键模块与职责

| 模块 | 职责 | 要点 |
|---|---|---|
| `src/usage/log.ts` | usage 日志持久化、读取、revision 追踪 | `PersistedUsageEntry` 全字段定义;`readUsageSnapshotForManagement()` 读尾部 64MB,超限置 `historyTruncated`;`MANAGEMENT_USAGE_MAX_ENTRIES` 上限截断(丢最旧) |
| `src/usage/summary.ts` | 汇总计算 | `UsageSummary` 结构;range 仅 `7d/30d/all`;surface 仅 `all/codex/claude/grok`;按天模型栈(heatmap 用);Provider/Model breakdown 带 `shareRatio`,超出 256 行聚合为 "other" |
| `src/usage/totals.ts` | 显示用 total | `usageDisplayTotalTokens()` = `max(explicitTotal, input+output)`,修复 cache 双重计数历史 bug |
| `src/usage/cost.ts` | 估算成本 | 仅估算(list-price equivalent),GUI 已注明非账单 |
| `src/server/request-log.ts` | 内存请求日志(环形缓冲) | `/api/logs` 数据源;支持 provider/conversationId/status/tail/offset/limit 过滤;`MAX_LOG_SIZE` 上限 |
| `src/server/management/logs-usage-routes.ts` | `/api/usage`、`/api/logs`、debug、storage 路由 | usage 结果有内存缓存(按 `range:surface` + 文件 revision),有效期到最近一条记录滑出窗口或次日午夜 |
| `src/server/management/request-history-routes.ts` | `/api/request-history` | 见 §5;含 `/:requestId` 单条与 `/:requestId/route-decision` |
| `src/routing/history/indexer.ts` | SQLite 派生索引 | 增量追加、完整性校验、损坏自动重建;`requestHistoryDb()` 暴露原始 DB 供分析型查询 |
| `src/routing/history/cursor.ts` | 游标编解码 | base64url JSON `{t, i}`,排序 `timestamp DESC, request_id DESC` |
| `src/routing/history/schema.ts` | 索引 schema | 24 列 + 8 个索引,`HISTORY_SCHEMA_VERSION=1` |
| `src/server/management/usage-summary-cache.ts` | usage 汇总缓存 | LRU + 内存预算 |

### 3.3 真实数据验证(本机 `usage.jsonl`,2026-08-07 ~ 08-08,4908 条)

顶层字段覆盖:requestId/timestamp/provider/model/status/durationMs/usageStatus 100%;conversationId/requestedModel/routeDecision 99.9%;usage/totalTokens 92.9%;resolvedModel 93.2%;errorCode 7.1%(非 200 共 348 条)。
usage 子字段:inputTokens/outputTokens 100%(4557 条中);cachedInputTokens 98.7%;cacheReadInputTokens 27.4%;cacheCreationInputTokens 16.0%;reasoningOutputTokens 83.4%。
Provider 分布(11 个):opencode-go 1511、commandcode 993、openai 742、command-code 522、sensenova 353、alibaba 288、opencode-zen 258、minimax-cn 111、nvidia 61、xai 58、mistral 11。
Status 分布:200 4560;5xx 233(503/504/502);4xx 115(403/401/429/400/404/499)。

→ 说明:Provider/Model/Status 过滤字段在真实数据中都有值且基数合理,过滤 UI 有实际意义。

---

## 4. Current OpenCodex GUI Limitations

GUI 为 React SPA(编译产物 `gui/dist/assets/index-*.js`,约 1.6MB),i18n 键前缀 `usage.*`、`logs.*`、`nav.*`。基于编译产物与 CSS 类名逆向出的现状:

### 4.1 页面结构(侧边栏 `nav.*`)

Dashboard / Startup / Providers / Models / Combos / Subagents / **Logs & Debug** / **Usage** / Storage 等页面。

- **Usage 页**:`usage-workspace-root` → 左侧 `usage-workspace-rail`(工作区列表)+ 右侧 `usage-workspace-main`(内容)。内容含:
  - `usage-filters`:`usage-segmented` 三段切换 **7d / 30d / All**(文案 `usage.range.7d/30d/all/available`)+ surface 过滤(Codex/Claude/Grok/All)。
  - `usage-cards`(KPI 卡):Requests、Measured、Reported、Total tokens、Cache reads、cache writes、coverage、cost(文案 `usage.card.*`、`usage.cost.*`)。
  - `usage-heatmap`(Daily activity 热力图,按天、按模型栈,tooltip 显示 `{tokens} tokens` / `{requests} requests`)。
  - `usage.section.overview/models/providers/coverage` 板块;Providers/Models 为表格(列 `usage.col.requests/measured/reported/tokens/share`),Models 有搜索框(`usage.search.models`)。
  - `usage.historyTruncated` 提示(64MB/条数截断时显示"Totals cover available history only…")。
- **Logs & Debug 页**:`logs-table` 请求表 + 详情抽屉;`logs-segmented`(Logs/Debug 页签);过滤仅 surface(All/Claude/Codex/Grok)+ conversation 搜索;有 auto-refresh;无分页(limit=2000 一次拉取,`api/logs?limit=2000`);列含 provider/model/status/time/tokens/effort/error/estimated cost/tok-per-sec(编译产物调用 `api/logs?limit=2000`,不调用 request-history)。

### 4.2 数字格式化现状(核心痛点,逆向自编译产物)

GUI 有至少两个格式化函数:

**`br(value, locale='en')`**(通用数字格式):
- 英文:`>=1e9` → `${(e/1e9).toFixed(2).replace(/\.?0+$/,'')}B`;`>=1e6` → `${(e/1e6).toFixed(1)}M`;`>=1e3` → `${(e/1e3).toFixed(1)}k`;否则原样。
- 德语:`>=1e9` → `X,XX Mrd.`;`>=1e6` → `X,X Mio.`;`>=1e3` → `X,X Tsd.`。
- **1 位小数 → ≥100M 时精度损失到 0.1M(即 10 万级);无原始值暴露;无 tooltip;无"精确整数"开关**。

实测(复刻函数行为):

| Raw | en 显示 | de 显示 |
|---|---:|---:|---:|
| 999 | 999 | 999 |
| 1,000 | 1.0k | 1 Tsd. |
| 12,340 | 12.3k | 12,3 Tsd. |
| 999,999 | 1000.0k | 1000 Tsd. |
| 1,000,000 | 1.0M | 1 Mio. |
| 1,234,567 | 1.2M | 1,2 Mio. |
| 99,999,999 | 100.0M | 100 Mio. |
| 100,000,000 | 100.0M | 100 Mio. |
| 128,394,822 | 128.4M | 128,4 Mio. |
| 1,000,000,000 | 1B | 1 Mrd. |
| 1,234,567,890 | 1.23B | 1,23 Mrd. |

**`Df(value, locale='en')`**(另一种,更粗):`>=1e6` 时若整数或精确则用 `Intl.NumberFormat(compact)`,否则 `Math.round(e/1e3)+'k'`;否则一律 `Math.round(e/1e3)+'k'`。例如 12,340 → `12k`(损失更多)。

**`Ut(e)`**(第三个,审查确认):阈值 **1e4**(1 万)而非 1e3;`e<1e4` 原样,`<1e6` → `${Ht((e/1e3).toFixed(1))}K`,`<1e9` → `M`,`<0xe8d4a51000` → `B`,更大 → `T`;`Ht()` 去尾零。**大写 K/M/B/T、1 位小数、1 万阈值**——与 `br()`(小写 k、1e3 阈值)不同,是独立格式化路径。本机运行中 GUI 的 token 显示可能走此函数而非 `br()`,改动 `br()` 后此路径不会自动跟随。

**货币格式** `Sr(value, locale)`:固定 4 位小数(`~$X.XXXX`)。

### 4.3 现有过滤与分页能力(前端侧)

| 能力 | Usage 页 | Logs 页 | request-history API |
|---|---|---|---|
| 时间范围 | 仅 7d/30d/All(segmented) | 无 | from/to 任意毫秒时间戳 |
| Provider | 无(仅 breakdown 展示) | 无(后端 `api/logs` 支持 provider 参数,前端未暴露) | provider 精确匹配 |
| Model | 无(仅 breakdown 展示) | 无 | model / requestedModel 精确匹配 |
| Status | 无 | 无(后端 `api/logs` 支持 status 参数,前端未暴露) | status 整数 |
| Conversation | 无 | 有(文本搜索) | conversationId 精确 |
| Surface | 有(all/codex/claude/grok) | 有(all/claude/codex/grok) | surface 精确 |
| 分页 | 无(汇总一次性) | 无(一次 2000 条) | keyset cursor,page 1..100,默认 50 |
| 趋势 | 热力图(按天,模型栈) | 无 | 无专用聚合端点(可自 `requestHistoryDb()` 计算) |

**结论**:GUI 的过滤/分页/趋势能力明显落后于后端已有 API。`/api/request-history`(含 cursor、status、from/to、provider/model/requestedModel)从代码看是为 GUI 准备的能力(注释 "RI-02")但**尚未接线**——这是本任务最直接的切入点。

---

## 5. OpenCodex Request-History API Capability Matrix

### 5.1 端点

- `GET /api/request-history?provider=&model=&requestedModel=&status=&conversationId=&surface=&inboundProtocol=&apiKeyId=&profileId=&fallback=&from=&to=&limit=&cursor=`
  - 排序 `timestamp DESC, request_id DESC`;返回 `{ entries, nextCursor?, hasMore, index:{schemaVersion,indexedRows,sourceSize,sourceMtimeMs,builtAtMs,lastError} }`。
  - `limit` 1..100(默认 50);`cursor` 不透明 base64url,非法返回 400 `invalid_cursor`;`status` 100..599 整数;`from>to` 返回 400。
- `GET /api/request-history/:requestId` → 单条(经 `requestLogDto`,含 displayMetrics)。
- `GET /api/request-history/:requestId/route-decision` → 路由决策追踪(RI-09)。

### 5.2 字段清单(UI 概念 → API 字段)

| UI 概念 | Backend/API 字段 | Available? | Notes |
|---|---|---:|---|
| Timestamp | `timestamp`(ms) | ✅ | 索引列,支持 from/to 范围 |
| Provider | `provider`(顶层)/ `attempts[].provider` | ✅ | 顶层=最终目标;attempts 保留组合/重试目标 |
| Requested model | `requestedModel` | ✅ | 独立过滤列 |
| Resolved model | `resolvedModel`(顶层)/ `attempts[].model` | ✅ | 顶层非空率 93%(真实数据) |
| Input tokens | `usage.inputTokens` | ✅ | 100% 覆盖(有 usage 的行) |
| Output tokens | `usage.outputTokens` | ✅ | 同上 |
| Cache read tokens | `usage.cacheReadInputTokens` | ✅* | 真实覆盖 27%;legacy 行需从 `cachedInputTokens` 减 `cacheCreationInputTokens` 恢复(代码已处理) |
| Cache creation/write tokens | `usage.cacheCreationInputTokens` | ✅* | 覆盖 16%;缺失属正常(非缓存写入请求) |
| Total tokens | `totalTokens`(顶层)/ `usage.totalTokens` | ✅ | 规范算法 `usageDisplayTotalTokens()`:max(显式 total, input+output) |
| Status | `status`(整数) | ✅ | 独立过滤列;另有 `usageStatus`(reported/unreported/unsupported/estimated)、`terminalStatus`、`errorCode`、`closeReason` |
| Duration | `durationMs`、`firstOutputMs` | ✅ | 过滤列不含 duration 范围 |
| Conversation/session | `conversationId` | ✅ | 独立过滤列;真实覆盖 99.9% |
| Surface | `surface`(undefined=codex / claude / claude-desktop / grok) | ✅ | 独立过滤列 |
| Fallback | `fallback`(0/1,派生自 attempts>1) | ✅ | 布尔过滤 |
| Route/Profile | `routeDecision.routeKind`、`routeDecision.profile.id/revision` | ✅ | profileId 独立过滤列 |
| API key | `apiKeyId` | ✅ | 独立过滤列 |
| Inbound protocol | `inboundProtocol`(responses/chat/messages) | ✅ | 独立过滤列 |
| Effort / service tier | `requestedEffort`、`effectiveEffort`、`responseServiceTier` 等 | ✅ | 详情展示用,非过滤列 |
| 估算成本 | `displayMetrics.cost`(DTO 附加) | ✅ | 响应时派生,不持久化 |

> 注:我**没有**臆造字段——以上全部来自 `PersistedUsageEntry` 类型定义与 indexer `extractRow()` 的列映射。

### 5.3 汇总侧(`/api/usage`)支持矩阵

| 能力 | 支持? | 说明 |
|---|---|---|
| range=7d/30d/all | ✅ | 固定三档 |
| surface | ✅ | all/codex/claude/grok |
| from/to 任意区间 | ❌ | 需后端扩展(§8) |
| Provider 过滤 | ❌ | |
| Model 过滤 | ❌ | |
| Status 过滤 | ❌ | |
| 按小时聚合 | ❌ | 仅按天(`days[]`) |
| 按 Provider/Model 聚合 | ✅ | `providers[]`、`models[]`,含 shareRatio;单 range 内 256 行上限+other |
| 汇总与明细一致性 | ⚠️ | summary 由同一批 entries 计算,内部一致;但与 request-history 过滤组合无对应关系 |

---

## 6. CC Switch Frontend Findings

### 6.1 材料限制说明

CC Switch(cc-switch 桌面应用)在本机为闭源 WebKit 应用(`com.ccswitch.desktop`),**没有前端源码、无打包资源可读**。可依据的实证材料:

- 数据库 `~/.cc-switch/cc-switch.db`(46292 条 `proxy_request_logs` + 93 行 `usage_daily_rollups` + providers/endpoints/pricing 等)。
- 设置 `settings.json`(含 `usageDashboardRefreshIntervalMs: 5000`、`language: zh`、`usageConfirmed: true`)。
- 公开产品形态:CC Switch 是桌面 GUI,含 Usage 仪表盘、请求日志、Provider/Model/Key 管理。

因此本节只能:
1. 从数据库结构反推其 Usage 前端消费的数据契约(哪些聚合/明细字段被展示);
2. 结合其产品定位(多 App 统一入口:Codex/Claude/Desktop/Grok/OpenCode 等)推断其信息架构;
3. 明确标注"推断"与"实证"。

> 若 Phase 2 需要更精确的 CC Switch 前端细节,需另行获取其源码或用户提供截图;本报告的映射建议不依赖逐像素复刻,只依赖可实证的数据契约。

### 6.2 实证:数据契约(数据库结构反推)

**`proxy_request_logs`(明细表,46k 条)** 字段即前端请求日志/明细可展示列:

| 字段 | 含义 | 对 OpenCodex 的启示 |
|---|---|---|
| `request_id` | 主键 | 已有一致概念 |
| `provider_id` / `provider_type` | Provider | OpenCodex `provider` |
| `app_type` | 来源应用(codex/claude/claude-desktop/grok/opencode) | 对应 OpenCodex `surface` |
| `model` / `request_model` | 实际/请求模型 | OpenCodex `model` / `requestedModel` |
| `input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_creation_tokens` | 四类 token 明细 | OpenCodex `usage.*`(全部已有) |
| `input_cost_usd` 等 5 个 cost 字段 + `total_cost_usd` | 成本(字符串存储,避免浮点) | OpenCodex 成本为估算派生,不在 V1 |
| `latency_ms` / `first_token_ms` / `duration_ms` | 延迟/TTFT/总时长 | OpenCodex `durationMs` / `firstOutputMs` |
| `status_code` / `error_message` | 状态/错误 | OpenCodex `status` / `errorCode` / `upstreamError` |
| `session_id` | 会话 | OpenCodex `conversationId` |
| `is_streaming` | 是否流式 | OpenCodex 无直接字段(可从 firstOutputMs 推断) |
| `created_at` | 时间 | OpenCodex `timestamp` |

**索引**(推断其查询模式):`(provider_id, app_type)`、`created_at`、`model`、`session_id`、`status_code`、`(app_type, created_at DESC)` → 前端按 provider/app/模型/会话/状态过滤 + 按时间倒序分页。**与 OpenCodex request-history 索引设计完全同构**。

**`usage_daily_rollups`(93 行)**:主键 `(date, app_type, provider_id, model, request_model, pricing_model)`,聚合列 `request_count / success_count / input_tokens / output_tokens / cache_read_tokens / cache_creation_tokens / total_cost_usd / avg_latency_ms`。

→ 这是 CC Switch Usage 仪表盘"按天、按 app×provider×model"聚合的数据源。OpenCodex 的 `/api/usage` `days[]` 已提供等效(按天 + 模型栈),但粒度是按天×模型,没有按天×provider 的独立维度,也没有 success_count / avg_latency 聚合。

**`model_pricing` / `providers` / `provider_endpoints` / `profiles` / `proxy_config`**:定价与配置侧,OpenCodex 用 `expected-prices.ts` 与 config 等价实现,不在本任务范围。

### 6.3 推断:CC Switch Usage 前端信息架构(需源码/截图复核)

基于产品形态与数据契约,推断其 Usage 仪表盘(研究提示 §4 所列元素)大概率包含:

- **Summary KPI 卡**:总请求、总 token(input/output/cache 分列)、总成本;大数字用千分位或 K/M 缩写。
- **时间控制**:Today / 24h / 7d / 30d / 自定义区间(设置里有 `usageDashboardRefreshIntervalMs` 轮询,仪表盘常驻)。
- **趋势图**:按天 token/成本曲线(数据来自 rollup)。
- **请求明细表**:provider/app/model/status/tokens/cost/延迟,支持按列过滤与分页。
- **Provider/Model breakdown**:表或图,含占比。
- **成本优先**:CC Switch 强项是成本核算(每 token 单价、按 provider 计费),OpenCodex 不追求成本精度(估算)。

---

## 7. CC Switch → OpenCodex UX/Component Mapping

| CC Switch UX / 组件 | 用途 | OpenCodex 现有等价物 | 推荐 |
|---|---|---|---|
| Usage summary cards | KPI 总览 | `usage-cards`(Requests/Measured/Reported/Total tokens/Cache reads/writes/coverage/cost) | 复用,增强:大数字精确值 tooltip;KPI 响应全局过滤 |
| Time-range selector | 时间过滤 | `usage-segmented`(7d/30d/All) | **增强**:加 Today / 24h / 7d / 30d / Custom(from/to);联动 request-history |
| Token trend chart | 趋势 | 热力图(按天、模型栈) | **新增/增强**:按天 token 折线(总/输入/输出/缓存读),可用现有 heatmap 数据,但需按 provider/model/status 过滤 |
| Request log table | 钻取 | `logs-table`(内存日志,limit 2000,无分页) | **迁移**:改接 `/api/request-history`(持久、游标分页、全过滤);保留详情抽屉 |
| Provider stats | breakdown | `usage.section.providers`(表,shareRatio) | 复用,响应过滤;加占比条 |
| Model stats | breakdown | `usage.section.models`(表 + 搜索,shareRatio) | 复用,响应过滤 |
| Exact-number tooltip | 精度 | 无 | **新增**:所有紧凑数字带 title/tooltip 精确整数值 |
| Cost display | 成本 | `usage.cost.total`(估算 + disclaimer) | 保留现状,不在 V1 扩展 |
| Conversation filter | 会话钻取 | Logs 页 conversation 搜索(文本匹配) | 复用,映射 `conversationId` 精确过滤 |
| Loading/empty/error states | 状态 | `usage.loading/empty/loadError`、`logs.noRequests/loadError` | 复用;新增分页 loading/错误态 |

**原则**:不复制 CC Switch 代码;逐项用 OpenCodex 组件(React + 既有 `br()`/i18n/表格样式)与既有 API 实现,保持实现独立(§14)。

---

## 8. Backend-Change Decision

```
Can the target V1 Usage Analytics feature be implemented without backend changes?
PARTIALLY
```

### 8.1 逐项判定

| P0 功能 | 无需后端? | 依据 |
|---|---|---|
| 精确 token 值可达 | ✅ 是 | 明细/汇总响应已含原始整数,前端加 tooltip/title 即可 |
| 紧凑数字格式化 | ✅ 是 | 前端 `br()` 改造 |
| 时间范围过滤 | ⚠️ 部分 | request-history 支持任意 from/to;但 **Summary/趋势 只能 7d/30d/all** |
| Provider 过滤 | ⚠️ 部分 | request-history 支持;Summary/趋势 不支持 |
| Model 过滤 | ⚠️ 部分 | 同上 |
| Status 过滤 | ⚠️ 部分 | request-history 支持;Summary/趋势 不支持 |
| 请求级历史 | ✅ 是 | `/api/request-history` 已存在(仅需 GUI 接线) |
| 游标分页 | ✅ 是 | 已存在 |
| Summary 与过滤器一致 | ❌ 否 | `/api/usage` 聚合不接受过滤条件 |
| Token 趋势 | ⚠️ 部分 | `days[]` 已有按天汇总,但无过滤;无小时粒度 |
| Provider/Model breakdown(P1) | ⚠️ 部分 | `providers[]/models[]` 已有,但无过滤 |

### 8.2 为什么不能纯前端计算

研究提示 §10 明确禁止"只把当前加载页求和当总过滤值"——这是正确的,理由:

1. **request-history 是游标分页的**,任何单页/前 N 页都只是子集,前端求和会系统性低估,且随翻页漂移。
2. **usage.jsonl 有截断**(64MB / `MANAGEMENT_USAGE_MAX_ENTRIES`),前端无法拿到完整数据集;即使拿到,浏览器内全量过滤 10 万+ 行也不可持续。
3. `/api/usage` 已是服务端聚合,正确性与缓存由后端保证;缺的只是"过滤参数透传"。

### 8.3 最小后端改动(单一、低风险)

**方案 A(推荐):给 `/api/usage` 增加可选过滤参数并透传给 `summarizeUsage`。**

```
GET /api/usage?range=7d|30d|all&surface=...&provider=...&model=...&status=...&from=...&to=...
```

1. 缺失能力:`summarizeUsage(entries, range, now, surface)` 只按 range+surface 过滤,无 provider/model/status/from/to。
2. 最小改动:
   - `summary.ts`:`UsageSummary` 增加 `filters` 字段(透传回显);`summarizeUsage` 增加 `filters?: UsageSummaryFilters` 参数,过滤谓词在现有 `filteredEntries` 链上追加 provider/model(requested 或 resolved)/status/from/to 匹配。**provider/model 匹配语义与 indexer 一致:顶层精确匹配(entry.provider / entry.model),不含 attempts**(经审查核实 indexer.ts `provider = ?` / `model = ?` 作用在顶层字段;`finalAttemptTarget` 只用于 route-decision 详情)。
   - `logs-usage-routes.ts`:解析并校验 `provider/model/status/from/to` 参数(复用 request-history 的校验模式),拼入缓存 key(现有 key 是 `range:surface`,需扩展为包含过滤条件,否则不同过滤会串缓存)。
   - 缓存:key 改为序列化过滤条件;过期逻辑不变。
3. 兼容性:全部新参数可选,旧调用不变;响应新增 `filters` 字段(加性)。
4. 测试:`summarizeUsage` 过滤单测(provider/model/status/from/to、组合、空结果);路由参数校验(非法 status/from>to);缓存 key 隔离测试;`privacy:scan`(涉及日志/账户 fixture)。

**方案 B(最小):不动 `/api/usage`,趋势与 Summary 各自为政。**
- 不可接受:违反"Summary 与过滤器一致"的 P0 要求。

**方案 C(过度):新增独立聚合表/批处理。**
- 违反"不引入平行分析存储"原则;request-history 索引已是派生投影,再加聚合表属于过度设计。

### 8.4 兼容性影响

- API 加性扩展,旧 GUI(不带过滤参数)行为完全不变。
- `UsageSummary` 增加可选字段,TypeScript 兼容(旧字段不变)。
- 缓存 key 变化只影响缓存命中率,不影响正确性(命中必须带相同过滤条件)。

---

## 9. Proposed OpenCodex Usage UX

### 9.1 页面线框(Markdown)

```text
Usage
├── Global filters bar
│   ├── Time:  [Today] [24h] [7d] [30d] [Custom ▾]        (from–to pickers in Custom)
│   ├── Surface: [All|Codex|Claude|Grok]
│   ├── Provider: [All ▾]
│   ├── Model: [All ▾]            (options 随 Provider 联动)
│   ├── Status: [All|2xx|3xx|4xx|5xx|具体码]
│   └── [Reset]
├── Summary (KPI cards, 响应全部过滤)
│   ├── Requests      ├── Total tokens (精确值 tooltip)
│   ├── Input tokens  ├── Output tokens
│   ├── Cache reads   ├── Cache writes
│   └── Cost (估算, 现状)
├── Token trend (按天折线: total / input / output / cache read)
│   └── 数据 = 过滤后的 days[] 或 request-history 聚合
└── Detail section (tabs)
    ├── Requests   ← 请求明细表(接 /api/request-history, 游标分页)
    │   columns: time / provider / requested→resolved model / status / in / out / cache / total / dur / surface
    │   row 点击 → 详情抽屉(复用 logs.detail.*)
    ├── Providers  ← breakdown 表(响应过滤, 占比条)
    └── Models     ← breakdown 表(响应过滤, 搜索)
```

### 9.2 布局决策

- **保留现有 workspace 布局**(`usage-workspace-root/rail/main`),不重建信息架构;新增 Global filters 条放在 rail 与 main 之间或 main 顶部,沿用 `usage-filters` 样式。
- **Detail 区用 tabs**(Requests/Providers/Models)而非整页堆叠,因为三者共享同一过滤条件且请求表会很长。
- **趋势图**:优先复用现有按天 `days[]`(需后端过滤支持);若后续要小时粒度再评估。

### 9.3 Global filters 语义(一致性规则)

- Summary / Trend / Requests / Providers / Models **全部**由同一过滤条件驱动。
- 时间语义:`Today`=本地 0 点至今;`24h`=now-24h;`7d`/`30d`=沿用现有 range 窗口;`Custom`=from/to(毫秒时间戳)。
- Summary/trend 走 `/api/usage`(扩展后带过滤);Requests 走 `/api/request-history`(相同过滤条件)。
- **切换过滤器必须重置游标**(§11)。
- **Reset** 一键清空 provider/model/status/custom,时间回到 30d。

---

## 10. Data Flow and Field Mapping

### 10.1 目标数据流

```text
usage.jsonl (canonical)
   ├── /api/usage?range&surface&provider&model&status&from&to   → Summary + Trend + Provider/Model breakdown
   └── /api/request-history?provider&model&requestedModel&status&from&to&surface&cursor&limit
                                                               → Requests 明细表
                        ↑ GUI API client/hooks(React Query 或自写 hook)
                        ↓
              Enhanced Usage Analytics UI(过滤条 + KPI + 趋势 + tabs)
```

### 10.2 前端字段映射(明细表)

| UI 列 | 来源字段 | 格式化 |
|---|---|---|
| Time | `timestamp` | 本地化时间 |
| Provider | `provider`(attempts 时取末次) | 图标 + 名称 |
| Model | `requestedModel` → `resolvedModel` | 若不同显示 `req → res` |
| Status | `status` + `usageStatus` | 彩色徽章;错误显示 `errorCode` tooltip |
| Input | `usage.inputTokens` | 紧凑 + 精确 tooltip |
| Output | `usage.outputTokens` | 同上 |
| Cache read | `usage.cacheReadInputTokens`(legacy 恢复规则同后端) | 同上 |
| Total | `totalTokens`(规范算法同 `usageDisplayTotalTokens`) | 同上 |
| Duration | `durationMs` / `firstOutputMs` | `X.Xs` / TTFT |
| Surface | `surface`(undefined→codex) | 徽章 |

### 10.3 汇总卡字段映射

| KPI | 来源(`summary.*`) |
|---|---|
| Requests | `summary.requests` |
| Measured / Reported | `summary.measuredRequests` / `summary.reportedRequests` |
| Total tokens | `summary.totalTokens` |
| Input / Output | `summary.inputTokens` / `summary.outputTokens` |
| Cache reads / writes | `summary.cacheReadInputTokens` / `summary.cacheCreationInputTokens` |
| Coverage | `summary.coverageRatio` |
| Cost(保留) | `summary.estimatedCostUsd` + `pricedRequests/unpricedRequests/unmeteredRequests` |
| 截断提示 | `historyTruncated` / `truncatedPrefixBytes` / `entriesTruncated` / `entriesDropped` |

### 10.4 缓存命中率指标(新增需求)

> 用户需求:按 **模型 × 时间区间** 两个维度查看**缓存命中率**(不是缓存绝对值)。例如看某个模型在某个时间段内缓存命中情况如何。精度要求:**到小时即可**,不需要更细。

**官方定价文档核查(2026-08-08,结论:无官方"命中率"定义):**

各模型官方定价文档只定义缓存**价格**,不定义缓存**命中率**指标:

| 厂商 | 缓存定价结构 | 官方语义要点 |
|---|---|---|
| Anthropic | cache read / cache write 两个价格 | 写按 10 分钟 TTL 计费,读有 5min/1h 等多档;定价页只谈价格 |
| OpenAI | 缓存读写折扣价 | 缓存命中自动发生、不可控,只影响计价 |
| DeepSeek | 命中/未命中两档输入价 | 官方称"上下文硬盘缓存",命中价约为未命中价 1/10 |
| Google/Gemini | 缓存读/写价格 | 类似 Anthropic |

→ 结论:**"缓存命中率"没有官方定义可抄**。各家仅以价格体现缓存收益,甚至对"输入 token 是否含缓存读"定义都不同(OpenCodex `totals.ts` 专门处理过此坑)。因此命中率必须**自定口径**(见下),且必须基于 OpenCodex 自己的字段语义。

**CC Switch 口径核查(本机数据库实证,结论:它不算命中率):**

- `model_pricing` 表只有 `cache_read_cost_per_million` / `cache_creation_cost_per_million` 两个价格字段,**无命中率字段**。
- `proxy_request_logs`、`usage_daily_rollups` 只有 `cache_read_tokens` / `cache_creation_tokens` 绝对值,**无 hit rate / ratio 列**。
- 真实数据警示:CC Switch 汇总中缓存读**经常大于 input_tokens**(如某行 `cache_read=13,162,480` 但 `input=2,365`,比值 556 万%),说明其 `input_tokens` **不含缓存读**,与 OpenAI/Anthropic/OpenCodex 口径不同。

→ 结论:**CC Switch 只展示缓存 token 绝对值,不算命中率**;且其字段口径与 OpenCodex 不同,**不能照搬 CC Switch 字段做比例**,只能参考其"展示缓存读/写绝对值"的方式。

**指标定义(两种口径,需二选一;审查发现原稿口径 A 分母存在内部矛盾,此处已修订):**

| 口径 | 公式 | 含义 | 数据可得性 |
|---|---|---|---|
| A1. 全集口径 | `ΣcacheReadInputTokens / ΣinputTokens`(全部有 usage 的请求) | 输入 token 中有多少来自缓存命中 | ✅ 直接可得;但 ~73% 无 cacheRead 字段的请求贡献 0 分子,命中率被系统性拉低;需在 UI 标注覆盖率 |
| A2. 条件子集口径(推荐) | `ΣcacheReadInputTokens / ΣinputTokens(仅有 cacheReadInputTokens 字段的行)` | 有缓存报告的请求中,输入命中缓存的比例 | ✅ 可得;分母与分子同一集合,比率可复现;分母为 0 显示 `—` |
| B. 命中/未命中比 | `cacheReadInputTokens / (cacheReadInputTokens + cacheCreationInputTokens)` | 需要缓存的输入里命中占比 | ✅ 可得;分母为 0 时显示 `—`(无缓存活动) |

> **决策点(修订)**:核查官方定价后无官方定义可抄;CC Switch 不算命中率。**推荐口径 A2(条件子集)并作为默认**:分母与分子限定在同一"有缓存报告"的请求集合,比率可复现,不会被 73% 无缓存字段的请求稀释。口径 A1(全集)在概念上等于"全体输入中命中比例",但受字段覆盖率影响,只能作为补充指标并标注覆盖率。口径 B 只算缓存子系统内部,偏乐观,不推荐作主口径。此点需用户最终确认后在单测中锁定。

**数据来源**:请求级字段 `usage.cacheReadInputTokens`(读)、`usage.cacheCreationInputTokens`(写),legacy 行按后端既有恢复规则(从 `cachedInputTokens` 减 `cacheCreationInputTokens`,见 summary.ts `addTokens`)。两个字段在真实数据中的覆盖率为 27% / 16%(§3.3)。**口径 A2 分母只计有 cacheRead 字段的行;口径 A1 分母为全部有 usage 的行(需展示覆盖率)**——两种口径在单测中必须分别锁定,不能混用。

**聚合粒度**:按小时。当前 `/api/usage` 只有按天 `days[]`(§5.3),**小时粒度需后端支持**(见 §16 defer 项)。

**UI 呈现建议**(不绑定方案,Phase 2 再细化):

- 透视表:行 = 模型,列 = 小时/天,单元格 = 命中率百分比 + tooltip 显示精确 token 值;
- 或折线:按小时命中率曲线,按模型分系列,配合时间区间过滤;
- 在模型 breakdown 表中加"缓存命中率"一列(随全局过滤联动)。

---

## 11. Pagination and Performance Design

### 11.1 明细表分页(接 `/api/request-history`)

- **页面大小**:默认 50,上限 100(后端约束 `REQUEST_HISTORY_DEFAULT_PAGE_SIZE / MAX_PAGE_SIZE`)。
- **游标**:不透明 base64url,`nextCursor` 只在 `hasMore=true` 时返回;前端存 cursor 即可,不做本地推测。
- **稳定排序**:`timestamp DESC, request_id DESC` 复合排序,天然稳定(同毫秒多行也有序)。
- **交互**:推荐 **"加载更多"按钮 + 滚动到底自动触发** 二选一;考虑 GUI 现有 Logs 是"一次拉 2000 条"的简单模型,首版建议显式"Load more"按钮(更可控、易测),后续可换无限滚动。
- **过滤器变更**:重置 cursor、清空列表、重新拉取第一页;并发请求用请求序号/AbortController 丢弃过期响应(stale query 处理,见下)。
- **大历史行为**:后端索引在查询时增量追加(`ingestSourceTail`),单页查询 O(limit + 索引);前端只持有当前页,内存恒定。

### 11.2 stale / 竞态处理

- 每次 fetch 带 AbortSignal;过滤器变化时 abort 在途请求。
- 以"发起序号"或 `useEffect` 依赖数组保证:只有最新过滤条件的结果能落地。
- 汇总请求与明细请求可并行,但 UI 应保证同一过滤条件快照(过滤条件先冻结为不可变对象,再分发两个请求)。

### 11.3 汇总/趋势请求

- 沿用现有 `/api/usage` 缓存(后端内存缓存);前端对同一过滤条件去重(React Query staleTime 或简单 memo)。
- 趋势聚合的过滤语义与 Summary 相同,同一请求返回,天然一致(§10)。

### 11.4 性能风险

- `summarizeUsage` 是全量过滤计算(O(entries));现有实现已在后端缓存。**新增过滤参数后,缓存 key 变多,注意内存预算**(现有 `enforceAppOwnedMemoryBudget` 会驱逐)。
- 若某 provider/model 过滤结果仍大,可先限制 breakdown 行数(现有 256 行 + other 已处理)。

---

## 12. Number Formatting Specification

### 12.1 目标规范(确定性)

| Raw | Compact (en) | 精度 |
|---|---:|---|
| 999 | 999 | 原样 |
| 1,000 | 1K | 整数 |
| 12,340 | 12.34K | 2 位小数,去尾零 |
| 999,999 | 999.99K | 2 位小数 |
| 1,000,000 | 1M | 整数 |
| 1,234,567 | 1.23M | 2 位小数 |
| 99,999,999 | 99.99M | 2 位小数 |
| 100,000,000 | 100M | 整数 |
| 128,394,822 | 128.39M | 2 位小数 |
| 999,999,999 | 999.99M | 2 位小数 |
| 1,000,000,000 | 1B | 整数 |
| 1,234,567,890 | 1.23B | 2 位小数 |

规范:
- 阈值:`>=1e9` → B;`>=1e6` → M;`>=1e3` → K;否则原样。
- 小数位:统一 **最多 2 位**,去尾零;当 `value/suffix === 整数` 时小数位为 0(如 1000→1K,100000000→100M,不是 1.00K/100.00M)。
- 边界自洽:999→999;999,999→999.99K(不四舍五入到 1M);1,000,000→1M(整数);999,999,999→999.99M(不四舍五入到 1B)。→ 用"向下取整到单位 + 保留 ≤2 位有效小数,若四舍五入结果跨档则回退展示下一档"的实现细节在单测中锁定。
- **精确值始终可达**:compact 显示必须伴随 `title`/`aria-label` 的精确整数值(千分位);详情抽屉中显示完整整数。推荐封装 `<CompactNumber value locale />`,内部统一 tooltip。

### 12.2 与现有实现的差异

| 项 | 现状 `br()` | 目标 |
|---|---|---|
| 1,000 | 1.0k | 1K |
| 12,340 | 12.3k | 12.34K |
| 128,394,822 | 128.4M | 128.39M |
| 精确值可达 | ❌ | ✅ tooltip + 详情 |
| 德语 | Mrd./Mio./Tsd. | 保留(按 `Intl` locale 或既有约定) |
| 货币 | `~$X.XXXX` | 不动 |

### 12.3 实现位置与约定

- 修改 GUI 的 `br()`(编译产物中定位,源码在 `gui/src` 的格式化工具模块,需克隆后定位);新增 `formatTokenCount` / `CompactNumber` 组件。
- **locale 约定**:GUI 已有 en/de 双语(编译产物可见 `de` 分支与 i18n 字典);沿用现有 `locale` 传递方式,不引入新 i18n 框架。
- 先查 GUI 是否已用 `Intl.NumberFormat` 的 `notation:'compact'`(发现 `Df()` 用过 compact notation)→ 若 `Intl.NumberFormat(notation:'compact')` 输出与上表不一致(浏览器实现有差异),**不要依赖它做主显示**,用确定性手写逻辑;仅在需要千分位完整整数时用 `Intl.NumberFormat` 做 grouping。

### 12.4 单测边界(必测)

```
999 / 1,000 / 999,999 / 1,000,000 / 99,999,999 / 100,000,000 / 999,999,999 / 1,000,000,000
```
外加:0、负数(显示 — 或原样,按现有约定)、NaN/undefined、大数(> 2^53 不出现,整数安全范围内)、德语 locale 分支、精确 tooltip 值。

---

## 13. File-by-File Implementation Plan

> 路径基于 npm 包内源码;GUI 路径为 `gui/src/...`(编译产物对应,需克隆后确认精确文件名)。

### 13.1 后端(修改)

```text
src/usage/summary.ts
- why: 支持 provider/model/status/from/to 过滤,使 Summary/趋势与明细一致
- change: 新增 UsageSummaryFilters 类型 + summarizeUsage 过滤参数;响应增加 filters 回显
- risk: 中等——过滤谓词需与 indexer 语义一致;纯加性,不改旧行为

src/server/management/logs-usage-routes.ts
- why: 解析/校验新查询参数,并入缓存 key
- change: 解析 provider/model/status/from/to(复用 request-history 校验模式);缓存 key 由 range:surface 扩展为含过滤条件的稳定序列化
- risk: 中——缓存 key 变化影响命中率;校验错误返回 400 需与现有错误格式一致

src/server/management/request-history-routes.ts(不改,除非需要 duration 范围过滤)
- 说明: 已具备全部 P0 过滤;若产品要求 duration 过滤再扩展(见 §15 风险)

src/server/management/usage-summary-cache.ts(不改或极小)
- why: 缓存条目已支持任意 key;仅确认内存预算策略对新 key 数量 OK
- risk: 低

src/types.ts
- why: 若 UsageSummaryFilters 需进公共类型
- risk: 低(加性字段)
```

### 13.2 GUI(修改;源码路径以克隆仓库为准)

```text
gui/src/<format-utils>.ts(定位 br() / Df() / Ut() 三个格式化函数源码位置)
- why: 数字格式化规范(§12)
- change: 重写为确定性 2 位小数 + 精确值回调;保留 de 分支;**所有 toFixed+K/M/B/T 格式化路径统一收敛到新组件(含 Ut() 的 1e4 阈值路径),而非只改 br()**
- risk: 低-中——影响所有使用数字格式化的页面(需全局回归:Dashboard/Logs/Usage)

gui/src/components/<CompactNumber>.tsx(新组件)
- why: 统一紧凑数字 + 精确 tooltip
- change: 封装格式化 + title/aria-label + 可选完整整数展示
- risk: 低

gui/src/pages/Usage/…(过滤条)
- why: 增加 Today/24h/Custom/Provider/Model/Status 过滤与 Reset
- change: 扩展现有 usage-filters;状态提升为页面级单一过滤状态
- risk: 中——影响现有 range/surface 交互;需状态迁移

gui/src/pages/Usage/…(Summary 卡 + 趋势)
- why: KPI/趋势响应过滤
- change: 请求 /api/usage 时携带过滤参数;KPI 用 CompactNumber
- risk: 低-中

gui/src/pages/Usage/…(Detail tabs + 请求表,新)
- why: 接线 /api/request-history,提供游标分页明细
- change: 新 Requests tab:表格 + Load more + 详情抽屉(复用 logs.detail.*)
- risk: 中——分页/竞态是新逻辑;复用现有 table 样式

gui/src/pages/Logs(可选迁移)
- why: Logs 页仍走内存 api/logs;request-history 是持久版
- change: 若纳入本 PR,替换数据源;否则保留现状(见 §16 defer)
- risk: 中——行为差异(内存 vs 持久)需产品确认
```

### 13.3 新增文件

```text
gui/src/components/UsageFilters.tsx
- responsibility: 全局过滤条(时间/Provider/Model/Status/Reset)
- why new: 与现有单页过滤解耦,可复用、可测

gui/src/components/TokenTrend.tsx
- responsibility: 按天 token 折线(多序列 + legend + tooltip + 稀疏数据处理)
- why new: 现有 heatmap 不满足折线需求;独立组件便于单测

gui/src/hooks/useUsageFilters.ts(或并入现有 query hooks)
- responsibility: 过滤状态 → 序列化查询参数 + cursor 重置 + stale 丢弃
- why new: 过滤一致性规则(§9.3)集中管理,避免各组件自行发散

gui/src/hooks/useRequestHistory.ts
- responsibility: /api/request-history 封装(游标、hasMore、loading/error/empty、竞态)
- why new: 明细表分页逻辑与汇总解耦

src/usage/summary.test.ts、src/server/management/logs-usage-routes.test.ts(若有测试基建)
- responsibility: 过滤谓词、参数校验、缓存隔离
- why new: 遵循"focused regression coverage near existing tests"
```

---

## 14. Testing Plan

### 14.1 单元测试

| 测试 | 位置建议 | 覆盖 |
|---|---|---|
| 数字格式化 | GUI 格式化模块测试 | §12.4 全边界;de 分支;tooltip 精确值 |
| 日期区间转换 | 过滤条时间逻辑 | Today/24h/7d/30d/Custom;时区(本地)边界 |
| 过滤查询序列化 | `useUsageFilters` | 状态→URL 参数;空值剔除;reset |
| API 字段变换 | request DTO 消费层 | `timestamp`/tokens/attempts 到 UI 行;legacy cache 恢复 |
| `summarizeUsage` 过滤 | `src/usage/summary.test.ts` | provider/model/status/from/to;组合;空结果;与无过滤一致性 |
| 路由参数校验 | logs-usage-routes 测试 | 非法 status/from>to/limit 越界 → 400 |
| 缓存 key 隔离 | usage-summary-cache 测试 | 不同过滤不串缓存;revision 变化失效 |
| requested vs resolved model | 过滤语义测试 | 按 requestedModel 过滤与按 model 过滤互不影响 |

### 14.2 UI/组件测试(若仓库支持)

- 过滤变更 → 列表重置 + 重新请求;Reset 行为。
- Loading / empty / error(api 失败)三态。
- 分页:Load more 追加、hasMore=false 停止、cursor 传递。
- 行详情抽屉打开/关闭;精确值 tooltip 内容。

### 14.2b 过滤联动一致性断言(审查 P2,§9.3 最易翻车处)

报告 §9.3 的核心规则是"Summary / Trend / Requests / Providers / Models 由同一过滤条件驱动且数值方向一致"。单测必须能暴露跨端点语义漂移(如 §8.3 的 provider 顶层匹配问题):

- 构造一个含 fallback/attempts 的数据集(部分请求 provider 只在 attempts 里、顶层 provider 不同)。
- 断言:同一 provider 过滤下,`/api/usage` 的 `summary.requests` == `/api/request-history` 全量行数(用 cursor 翻完所有页,或与 `index.indexedRows` 交叉校验)。
- 断言:同一 model/status/from/to 过滤下,两个端点计数一致。
- 该测试应放在后端路由层(而非仅单元层),因为不一致源自两端过滤谓词实现差异。

### 14.3 构建/仓库验证(命令来自 package.json)

```bash
bun install --frozen-lockfile          # 依赖
bun run typecheck                      # 后端类型
bun test tests/<name>.test.ts          # 聚焦测试
bun run test                           # 全量(涉及共享路由/服务端行为时)
bun run privacy:scan                   # 涉及日志/请求/凭据/fixture 时(本任务必跑)
cd gui && bun run lint                 # GUI lint
cd gui && bun run build                # GUI 构建
cd gui && bun run doctor               # GUI doctor(截图/布局验证,若仓库配置)
```

> prepush 会自动跑 `typecheck + lint:gui:if-changed + test + privacy:scan + doctor:gui:if-changed`。提交前本地跑一遍 prepush 脚本(`bun run prepush`)是最省事的安全网。

### 14.4 手工验证(截图要求,若仓库要求)

- Usage 页:默认 30d;切 Today/24h/7d/30d/Custom;加 provider/model/status 过滤;Reset。
- 大数字:构造/查找 ≥100M 场景,确认 compact + tooltip 精确值。
- 明细表:翻页、过滤联动、空结果、错误态。
- 一致性:同一过滤下 KPI 与趋势与明细(第一页)方向一致(明细页合计不等于总览是正常的,§8.2;但趋势/KPI 必须同源)。

---

## 15. Risks / Unknowns

| # | 风险/未知 | 等级 | 缓解 |
|---|---|---|---|
| 1 | **GUI 源码不在 npm 包**;本报告 GUI 结论来自编译产物逆向,文件名/组件树需克隆后复核 | 高(计划层) | Phase 2 前克隆 `lidge-jun/opencodex`;用 §13 的"定位"动作校准 |
| 2 | `br()` 被多页面共用,改动影响 Dashboard/Logs 等所有大数字显示 | 中 | 全局回归 + 统一 CompactNumber 组件,避免散改 |
| 3 | `/api/usage` 缓存 key 扩展后,新 key 数量增长的内存影响 | 低-中 | 现有 `enforceAppOwnedMemoryBudget` 已兜底;观察 |
| 4 | 64MB / 条数截断导致 `historyTruncated` 时,Summary 不代表全历史 | 中(已存在) | 保留现有截断提示;文档说明;不做全量扫描 |
| 5 | provider/model 过滤语义必须与 request-history 的 indexer 一致(经审查核实:indexer 的 `provider = ?` / `model = ?` 是**顶层精确匹配**,不含 attempts;`finalAttemptTarget` 只用于 route-decision 详情,不参与列表过滤) | 中 | 方案 A 的 `summarizeUsage` 过滤谓词统一为"顶层精确匹配",与 indexer 对齐;否则 Summary 请求数 ≠ Requests 表行数,破坏 §9.3 一致性 |
| 5b | **版本漂移(审查确认,严重)**:npm 包 2.11.0 有 `/api/request-history` 全套,但上游 main HEAD(8a9c0ef,package.json version = 2.10.0)与 v2.11.0 **已分叉**(merge-base 为 v2.11.0 自身,二者互不为祖先)。HEAD 这条分叉线**从未引入** `src/routing/` 整套(含 history/indexer/cursor/schema)与 request-history-routes.ts——HEAD 更旧且功能缺失,不是"删除了 routing"。若误按"领先"理解并 rebase 到 HEAD,会丢掉 request-history 全套能力 | 高 | Phase 2 克隆后先 `git checkout v2.11.0`(或 `v2.11.0-preview.20260808`)定位与运行中版本一致的代码;以 v2.11.0 为基线评估方案 A 是否仍成立,再决定是否跟随 HEAD 的分叉/重构 |
| 6 | requested vs resolved model 过滤歧义(用户可能想按"实际用的模型"过滤) | 中 | 提供两个独立过滤(model=resolved, requestedModel=requested);UI 文案明确 |
| 7 | 趋势仅按天;用户可能期望小时粒度(CC Switch 支持?) | 低 | 明确不在 V1;评估时看 request-history 能否支撑 |
| 8 | Logs 页是否迁移到 request-history(内存 vs 持久语义差异) | 中 | 本 PR 默认不动 Logs,仅新增 Usage 内 Requests tab;另行决策 |
| 9 | 成本显示:估算成本与 CC Switch 精确成本差异可能被用户误解 | 低 | 保留 disclaimer;不扩展成本功能 |
| 10 | 德国 locale 分支行为(千分位/小数分隔)需与既有 i18n 一致 | 低 | 沿用既有 locale 约定;单测锁定 |
| 11 | **缓存命中率口径未定**(§10.4 口径 A vs B),影响所有命中率展示与单测 | 中 | Phase 2 开始前与用户确认;默认口径 A,UI 可切换 |
| 12 | **缓存字段覆盖率低**(真实数据 27%/16%),命中率视图易被缺失字段扭曲 | 中 | 分母只计有缓存字段的请求,展示覆盖率,缺失不当作 0 |

---

## 15.5 Phase 2 落地前置条件(先本机、后提交)

> 目标澄清:本任务的"Open WebUI"指**本机正在运行的 OpenCodex 自带 Web GUI**(服务端口 10100,前端即 npm 包内的 `gui/dist` 编译产物)。不是独立的 open-webui 项目。

研究阶段确认:当前机器上**没有 OpenCodex GUI 源码**(npm 包只发布 `gui/dist` 编译产物),因此"改源码 → 本地构建 → 本机 GUI 测试 → 提交"这条链路的第一步必须是先拿到源码仓库。落地顺序如下:

### 步骤 1:克隆上游仓库(一次性,必需)

```bash
# OpenCodex 官方仓库(README 与 package.json 声明)
git clone https://github.com/lidge-jun/opencodex.git ~/Projects/opencodex-dev
cd ~/Projects/opencodex-dev
```

克隆后需核对(修正本报告的假设):

- 根 `AGENTS.md`、`gui/AGENTS.md`(若有)、`CONTRIBUTING.md`:目标分支、PR 模板、截图要求。
- `gui/src/` 真实结构:确认 §4/§13 逆向出的组件名(`usage-workspace-*`、`usage-filters`、`br()` 格式化函数、`logs-table` 等)对应的实际文件路径。
- `tests/`、`scripts/`、`docs-site/` 是否存在及测试约定。

**版本对齐(审查确认,必须先做)**:npm 包 2.11.0 与上游 main HEAD(8a9c0ef)不一致——二者**已分叉**(merge-base 为 v2.11.0 自身,互不为祖先)。HEAD 的 package.json version = 2.10.0,比 2.11.0 旧,且其分叉线**从未引入** `src/routing/` 整套(request-history indexer/cursor/schema)与 request-history-routes.ts;v2.11.0 的源码树才有完整 request-history。因此:

```bash
git checkout v2.11.0        # 或 v2.11.0-preview.20260808,先对齐运行中的 npm 2.11.0
git diff v2.11.0 HEAD -- src/usage/summary.ts src/server/management/logs-usage-routes.ts
# 确认 /api/usage 过滤缺口是否仍存在;再决定方案 A 是否仍需要,以及是否跟随 HEAD 重构
```

### 步骤 2:本地构建与运行(验证"本机可测"链路)

```bash
cd ~/Projects/opencodex-dev
bun install --frozen-lockfile      # 装依赖(Bun,仓库规定)
bun run typecheck                  # 后端类型检查
bun install --frozen-lockfile      # 前端依赖是独立的一套(见下)
bun run build:gui                  # 构建 GUI(gui/dist)
bun run start                      # 启动(或按仓库 README 的 dev 方式)
```

> **GUI 依赖是独立一套(审查 P2)**:`gui/` 是独立前端项目,有自己独立的 `gui/package.json` 与 `gui/bun.lockb`。`bun run build:gui` 脚本内部会执行 `cd gui && bun install --frozen-lockfile && bun run build`,即**前端依赖(React/Vite/Tailwind)在构建时单独安装**,根目录 `bun install` 只装后端依赖。首次克隆后若 `gui/node_modules` 缺失或网络/原生依赖(如 esbuild 平台二进制)失败,构建会中断——建议把 `cd gui && bun install --frozen-lockfile` 作为独立验证步骤先跑一次。

验证点:启动后浏览器打开本机 OpenCodex Web GUI,确认 Usage 页当前行为(7d/30d/All 切换、热力图、数字显示 `1.0k` 风格)与报告 §4 描述一致,作为改动前基线。

### 步骤 3:按 §16 范围实施并测试

- 按 §17 检查清单与 §14 测试计划执行;每个提交独立可 review(提交拆分见 Implementation Sequence)。
- 全部通过后,对照上游 AGENTS.md 的 PR 要求提交 PR。

### 前置条件小结

| 前置项 | 状态 | 说明 |
|---|---|---|
| 上游源码仓库 | ❌ 未克隆 | `~/Projects/opencodex-dev` 尚不存在,步骤 1 必须先做 |
| GUI 源码路径 | ❌ 未知 | 需克隆后定位(§13 路径为逆向推断) |
| 本地构建链路 | ❌ 未验证 | 步骤 2 首次验证 `bun run build:gui` 在本机可用 |
| 本地 GUI 基线 | ❌ 未记录 | 步骤 2 建立改动前截图/行为基线 |
| 研究材料 | ✅ 已就绪 | §0.3 所列本机数据与源码均已定位 |

---

## 16. Recommended First-PR Scope

> 一句话:**"Expose existing OpenCodex request-history capabilities through a more useful Usage Analytics GUI."**

### Include(第一版)

- 精确/有用的 token 格式化(`br()` 规范 + CompactNumber + tooltip)。
- 时间过滤:Today / 24h / 7d / 30d / Custom(from/to)。
- Provider 过滤。
- Model 过滤(requested 与 resolved 独立)。
- Status 过滤(2xx/3xx/4xx/5xx + 具体码)。
- 请求明细表(接 `/api/request-history`,游标分页,Load more,详情抽屉)。
- Token 趋势(按天,响应过滤)。
- Provider/Model breakdown 响应过滤(低风险项)。
- 后端最小扩展:`/api/usage` 过滤参数 + 缓存 key(§8.3 方案 A)。

### Explicitly defer

- 定价/成本精度、预算、计费、配额预测。
- CSV/导出。
- Logs 页迁移到 request-history(若未纳入)。
- **缓存命中率透视(模型 × 时间区间,小时粒度)**——依赖小时级聚合,属 P1 增强;但 §10.4 的指标定义与字段映射已在本报告锁定。Phase 2 可在首个 PR 中先行实现"命中率列"(天粒度、随全局过滤),小时粒度透视放到后续。
- 自定义聚合数据库 / 平行分析存储。
- 与 usage 无关的重构。

---

## 17. Implementation Checklist

后端:
- [ ] `src/usage/summary.ts`:UsageSummaryFilters 类型 + summarizeUsage 过滤 + 响应 filters
- [ ] `src/server/management/logs-usage-routes.ts`:参数解析/校验 + 缓存 key 扩展
- [ ] `src/types.ts`(如需):filters 类型导出
- [ ] 后端单测:summarizeUsage 过滤、路由校验、缓存隔离
- [ ] `bun run typecheck` + 聚焦 `bun test` + `bun run privacy:scan`

GUI:
- [ ] 克隆上游仓库,核对 `gui/src` 结构与 AGENTS 规则
- [ ] **版本对齐:checkout v2.11.0(或 preview),diff 确认 `/api/usage` 缺口与 `/api/request-history` 是否存在(HEAD 已删除该 API)**
- [ ] 格式化:定位 br() / Df() / Ut() 三个函数,统一收敛到 CompactNumber(§12 规范)+ 单测
- [ ] 过滤条:useUsageFilters(时间/Provider/Model/Status/Reset)
- [ ] 汇总/趋势:请求带过滤参数;KPI 用 CompactNumber
- [ ] Requests tab:useRequestHistory(游标/竞态/三态)+ 表格 + Load more + 详情抽屉
- [ ] Providers/Models breakdown 响应过滤
- [ ] `cd gui && bun run lint && bun run build && bun run doctor`

验证:
- [ ] `bun run prepush`(typecheck+lint+test+privacy+doctor)
- [ ] 手工:过滤联动、分页、大数字 tooltip、空/错态、截图(如要求)

---

## Implementation Sequence(供 Phase 2 编码代理)

1. **克隆上游仓库**,读取根/`gui`/相关目录 AGENTS.md,确认分支与命令(修正本报告假设)。
2. **后端先行**(小而独立):summary.ts 过滤 → logs-usage-routes 参数/缓存 → 单测 → typecheck+test+privacy:scan。单独提交,便于 review。
3. **格式化层**:CompactNumber + br() 重写 + 单测(纯前端,可独立提交)。
4. **GUI 数据层**:useUsageFilters、useRequestHistory(先接通 request-history 明细,不动汇总)。
5. **GUI 视图层**:过滤条 → Requests tab(表格/分页/详情)→ Summary/趋势接过滤 → breakdown 响应过滤。
6. **全量验证**:prepush + 手工用例 + 截图。
7. 提交按"后端过滤 → 格式化 → 明细表 → 过滤联动"拆分,每个提交可独立 review。

---

## 审查修订记录(2026-08-08,独立 agent 审查后)

以下发现经独立审查 agent 提出,并由本机源码/上游仓库逐一核实后修订进正文:

| # | 严重度 | 发现 | 核实结果 | 修订位置 |
|---|---|---|---|---|
| 1 | P1 | 口径 A 分母自相矛盾(全集 vs 条件子集) | 属实:summary.ts 的 inputTokens 累加全集、cacheRead 只累加有字段的行(覆盖率 27%) | §10.4 拆为 A1/A2,推荐 A2 |
| 2 | P1 | provider/model 过滤语义与 indexer 不一致(报告写"顶层或 attempt",实际是顶层精确匹配) | 属实:indexer.ts `provider=?`/`model=?` 顶层匹配,不含 attempts | §8.3、§15 风险 5 |
| 3 | P2 | §15.5 构建命令漏 gui 独立依赖 | 属实:gui/ 是独立前端项目,build:gui 内部单独 `bun install` | §15.5 步骤 2 |
| 4 | P2 | npm 2.11.0 与上游 HEAD 版本漂移未核对 | **属实且严重**(后续修正了提交关系表述):HEAD(8a9c0ef,version=2.10.0)与 v2.11.0 已分叉、互不为祖先;HEAD 分叉线从未引入 `src/routing/` 整套与 request-history-routes.ts——HEAD 上 `/api/request-history` 不存在,且 HEAD 比 v2.11.0 更旧 | §15 风险 5b、§15.5 步骤 1、§17 |
| 5 | P2 | §14 缺"过滤联动一致性"跨端点断言 | 属实:单测只测单端点,暴露不了两端谓词漂移 | §14.2b |
| 6 | P3 | 遗漏第三个格式化函数 Ut()(阈值 1e4、大写 K/M/B/T) | 属实:gui/dist 中 `Ut()` 独立于 br()/Df() | §4.2、§13.2、§17 |

> 附带结论(审查确认):方案 A 仍是最小后端路径,三选一取舍合理;首个 PR 建议按"后端过滤参数"与"格式化层"拆成两个独立 PR(§16 Include 与 Implementation Sequence 口径已对齐)。

---

## Stop Condition

按研究提示:本报告为 Phase 1 交付物,已停止。未修改任何源代码、未创建提交、未开 PR。等待实现计划评审批准后进入 Phase 2。
