---
title: Usage Analytics 开发结项报告
date: 2026-08-09
category: reports
status: active
related: ["../superpowers/plans/2026-08-08-usage-api-filters.md", "../superpowers/plans/2026-08-09-token-formatting.md", "../superpowers/plans/2026-08-09-usage-detail-ui.md"]
---

# Usage Analytics 开发结项报告

## 1. 项目背景与目标

OpenCodex 本地 Web GUI 的 Usage 页面存在三类体验短板,本次开发针对性地全部解决:

| 短板 | 现状(v2.11.0) | 本次目标 |
|---|---|---|
| 大 token 数字精度不足 | `formatTokens()` 只保留 1 位小数,紧凑值之外拿不到精确值 | 最多 2 位小数截断,精确值始终可达(tooltip) |
| 缺少请求明细与过滤 | Summary 聚合只有 range/surface 两维,无 provider/model/status/时间区间过滤,无请求明细 | `/api/usage` 支持五类过滤参数,页面新增请求明细表与过滤条 |
| 缺趋势视图 | 只有热力图与 daybar,无按天 token 趋势 | 手写 SVG 趋势图(基于过滤后 days[]) |

Phase 1 研究报告来自 `/Users/fei/projects/Opencodex/opencodex dev/` 目录,共三份:

- `opencodex_usage_analytics_phase1_research_prompt.md` — 研究任务书
- `opencodex_usage_analytics_phase1_research_report.md` — 研究报告(含 §8.3 过滤设计、§9.3 一致性规则、§12 格式化规范)
- `opencodex_usage_analytics_phase1_review_response.md` — 对独立审查 6 项发现(P1×2/P2×3/P3×1)的逐项回复与修订记录

开发实施依据三份计划文档(`docs/superpowers/plans/`),对应三个 PR;结项验收依据 `.superpowers/sdd/2026-08-09-usage-detail-ui/` 下的验证报告与 progress.md(ledger)。

## 2. 三个 PR 概述

### PR 1 — 后端:`/api/usage` 过滤参数(计划 `2026-08-08-usage-api-filters.md`)

**改了什么**:`summarizeUsage()` 过滤链新增 `provider` / `model` / `status` / `from` / `to` 可选过滤;路由层解析/校验并并入缓存 key;`UsageSummary` 回显 `filters`。

- `src/usage/summary.ts` — 新增 `UsageSummaryFilters` 类型与过滤谓词,顶层精确匹配(与 request-history indexer 语义一致,不含 attempts);from/to 优先于 range 窗口,避免双重裁剪
- `src/server/management/logs-usage-routes.ts` — 参数解析与校验(非法 status/from/to 返回 400 `invalid_*`);缓存 key 隔离(不同过滤条件不串缓存)
- `tests/usage-summary.test.ts` / `tests/api-usage.test.ts` — 过滤谓词、参数校验、缓存隔离、跨端点一致性(usage == request-history 翻页总数)四类测试
- `src/routing/history/indexer.ts` — 后续 6a 补 surface 语义化(`codex`→`surface IS NULL`、`claude`→`IN ('claude','claude-desktop')`、`grok`→`='grok'`,其他字符串精确匹配向后兼容)

**为什么**:让 Summary/趋势与 request-history 明细在同一过滤条件下保持一致;过滤语义必须与 indexer 对齐(顶层精确匹配),否则两个端点计数对不上。

### PR 2 — 格式化:`formatTokens` 升级 + `CompactNumber`(计划 `2026-08-09-token-formatting.md`)

**改了什么**:

- `gui/src/format-tokens.ts` — 小数位从 1 位升级为「最多 2 位、去尾零」;跨档边界用**截断**而非四舍五入(如 999,999,999 → `999.99M` 而非进位到 1000M);新增 `formatTokensExact()` 输出千分位完整整数;CJK(万/亿)与德语(Mrd./Mio./Tsd.)分支保留
- `gui/src/components/CompactNumber.tsx`(新建)— 紧凑值展示 + `title`/`aria-label` 精确值
- `gui/src/provider-workspace/usage.ts` — `formatRequestCount()` 小数位对齐(≤2 位去尾零),`formatTokenCount()` 同步
- `gui/src/pages/Usage.tsx` / `gui/src/pages/Logs.tsx` — 关键大数字接入 `CompactNumber`
- `gui/tests/format-tokens.test.ts` / `gui/tests/compact-number.test.tsx`(新建)— §12.4 全边界单测 + 渲染/tooltip 测试

**为什么**:大 token 数字的紧凑显示会丢精度(如 `1.6B`),用户无法确知真实值;规范是「紧凑值可读、精确值可达」。

### PR 3 — 明细 UI:过滤条 + 请求明细表 + Token 趋势(计划 `2026-08-09-usage-detail-ui.md`)

**改了什么**:

- `gui/src/hooks/useRequestHistory.ts`(新建)— `/api/request-history` 游标分页 hook(limit=50 + nextCursor 循环,不做前端全量加载)
- `gui/src/components/UsageFilterBar.tsx`(新建)— provider/model/status/from/to 过滤条
- `gui/src/components/RequestHistoryTable.tsx`(新建)— 请求明细表(复用 `tbl`/`logs-table` 样式)
- `gui/src/components/TokenTrend.tsx`(新建)— 按天 token 折线,基于过滤后 days[] 手写 SVG
- `gui/src/pages/Usage.tsx` — 过滤状态扩展 + 明细表/趋势接入;后补改动见下
- `gui/tests/use-request-history.test.ts` / `gui/tests/usage-filter-bar.test.tsx`(新建)— 分页/竞态/重置/过滤条交互测试

**为什么**:让用户能按 Provider/Model/Status/时间区间下钻请求明细,并看到 token 趋势;Summary/趋势/明细共用同一过滤条件(§9.3 一致性规则),切换过滤必须重置游标。

#### 后补 6a:`range`/`surface` 对齐 + 重置/重试修复(commit `43a42224`)

- `useRequestHistory` 签名扩展为 `(apiBase, filters, range, surface)`;`buildHistoryUrl` 中 `range` → `from` 换算(all 不传 / 30d / 7d),仅当 `filters.from` 未设时生效(from/to 优先,与 `/api/usage` 语义一致)
- surface 透传后端语义化匹配;过滤切换 effect 作废游标 + 清空旧数据 + 拉第一页,setState 移入微任务满足 lint
- 新增 `retryFirstPage()`(清状态 + 拉第一页),错误态 Retry 从 `loadMore` 改挂 `onRetry`
- 后端 `indexer.ts` `queryRows` surface 过滤语义化,与 `usageEntryMatchesSurface` 对齐(见 PR 1)

#### 后补 6b:Provider 动态 + 日期本地化(commit `4e201119`)

- Provider 输入框 + datalist 建议 = 静态 openai/claude/grok 与 `data.providers`(过滤后真实 Provider)并集去重;仍可自由输入任意值(datalist 是建议不是限制)
- `gui/src/usage-date-utils.ts`(新建)三个纯函数:`dateInputToLocalStart`(本地 00:00:00.000)、`dateInputToLocalEnd`(本地 23:59:59.999)、`tsToDateInput`(本地日期回读);替代 `Date.parse`/`toISOString` 的 UTC 语义

## 3. 关键设计决策(含权衡)

| # | 决策 | 内容与权衡 |
|---|---|---|
| 1 | 过滤语义与 indexer 顶层精确匹配对齐 | `provider`/`model` 匹配 `entry.provider`/`entry.model` 顶层列,不含 attempts。若不齐,`/api/usage` 与 `/api/request-history` 计数必然不一致——一致性是本次验收红线 |
| 2 | from/to 优先于 range | 传了 from/to 时忽略 range 的 since 裁剪(计划审查 P1 修订)。request-history 无 range 概念、只认 from/to;若 usage 叠加 since 会双重裁剪,两端点对不上。代价:range 与 from/to 同时传时 range 语义被覆盖,但 GUI 不会同时使用 |
| 3 | status 大类走方案 B:后端区间匹配 | 支持 `2xx/4xx/5xx`(前端发大类、后端展开为 100-299 等区间),仿 `/api/logs` 的 2xx 语法;精确 status 仍可用。方案 A(前端展开枚举)会把全量枚举值暴露给前端,后端区间匹配更干净、与既有日志语法一致 |
| 4 | surface 语义化 | `codex`=`surface IS NULL`(桌面/CLI 入口不写字段)、`claude`=`IN ('claude','claude-desktop')`、`grok`=`='grok'`、其他字符串精确匹配向后兼容。明细(6a)与 Summary 的 `usageEntryMatchesSurface` 完全对齐;实测 codex+claude+grok = 9904+123+0 = 10027 = 全量,无遗漏无重叠 |
| 5 | 日期本地日初/日末 | `from`=本地 00:00:00.000、`to`=本地 23:59:59.999。旧实现用 `Date.parse`/`toISOString` 是 UTC 语义,在 UTC+ 时区会把当天数据排除——选「当天」却少一天,用户感知明显 |
| 6 | useRequestHistory 竞态防护 | 三层:seq guard(响应返回时校验请求序号,丢弃过期响应)、`filtersRef`(effect 闭包读最新过滤值)、`retryFirstPage`(清状态+拉第一页)。竞态会导致过滤切换后旧数据残留或显示错位(见 6a 修复) |
| 7 | 只画 total 趋势,手写 SVG | 无图表库依赖,直接基于过滤后 days[] 的 totalTokens 手写 SVG 折线,37 个数据点均带 `title` 精确值。权衡:不引入图表库避免体积与学习成本,但 x 轴等距、全零/单点贴底等细节留作 deferred minor |

## 4. 验证结论

**8 个维度全部通过,0 真实缺陷。** 环境:`http://127.0.0.1:10100`(launchd 托管开发版,真实 usage 数据,实时写入);全程只读验证。

| # | 维度 | 结果 |
|---|------|------|
| 1 | API 功能 | 5/5:过滤参数回显类型保真、status 大类、surface 语义化、range/from-to 一致性、边界含等号全过 |
| 2 | GUI 交互 | 5 个修复点前端行为全对;报告自述 8/9,唯一未过项 surface=Grok 明细空结果经数据完整性验证澄清为数据口径问题,非前端 bug |
| 3 | 一致性 | 5 场景:usage == request-history 翻页总数完全相等(默认 30d=10429、status=4xx=140、provider=openai=1970、surface=codex=10308 等) |
| 4 | 边缘/压力 | 13/13:深翻页 104 页/10,339 行 requestId 全唯一、非法参数 8/8 精确 error.code、并发 10 个过滤无串缓存、快速切换无残留、错误态 Retry 恢复 |
| 5 | 格式化 | 4 项:KPI 1.55B→title 精确 1,556,937,630;明细 42.09K→42,093;趋势图 37 点带 title;中文「15.6亿」→1,560,227,265,CJK 刻度正常 |
| 6 | 跨页面回归 | 5 页(dashboard/logs/storage/models/providers)正常渲染,无 console error |
| 7 | 数据完整性 | 6/6:索引与 usage.jsonl 覆盖区零缺口零重复零多余,差异全部为增量索引延迟(设计内行为) |
| 8 | 重启韧性 | 5/5:launchd 8 秒自愈、启动安全页 protected 无告警、7 天数据无丢失 |

合计 51 项判定通过 + 1 项(GUI Grok 空结果)判定为数据口径问题、非功能缺陷;另有 1 项专项排查(startup-health,faraday)。

验证报告位于 `.superpowers/sdd/2026-08-09-usage-detail-ui/`(gitignored,仅本机保留;总汇总为 `VERIFICATION-SUMMARY.md`)。其中 `api/gui/edge/dataintegrity/restart/startup-health` 六份独立报告存在;格式化、一致性、跨页面回归三轮因 agent 中断改由控制器直跑,结论记录在 progress.md(ledger)。

## 5. 遗留项(非阻塞)

### 5.1 Deferred minors(开发期 ledger 记录,经 final review 判定可延后)

包括但不限于:Provider 输入防抖、`hasMore` 消费后端契约字段(现用 `!!nextCursor`)、`StatusClass` 类型跨端共享、model 输入防抖、等距 x 轴、全零/单点贴底、`Intl.NumberFormat` 每渲染新建、死代码 Notice、aria-labelledby 不完整、loadMore 失败无反馈、status=300 无专测、`tsToDateInput` 0 值无防御等。

### 5.2 Startup-health 探针 30s TTL 的 SWR 固有 stale 窗口

GUI 偶发「闪一下需要处理」:30 秒 TTL 过期后首个请求必命中 SWR 后台探针的 stale 窗口(实测 0.3~0.7s),展示层降级为 at-risk。**不影响重启保护实际功能**(探针纯本地纯同步,launchd/服务/shim 均未被触碰)。级别经 faraday 专项排查由「中」下调为「低」。已给出 P1~P4 建议:

- P1:GUI 端 stale 视为「刷新中」而非「失败」(用户感知直接来源)
- P2:探针失败时缩短/区分失败缓存 TTL
- P3:子进程超时 5s→2s 并记录退出码
- P4:排查 bun 子进程偶发 SIGTRAP exit=133

### 5.3 可选改进

- 明细表头显示总条数(total 字段已在 API 响应中)
- request-history 始终传时间范围(现不传 from/to 时全表扫描,当前数据量无压力,长期运行建议补)
- 其他见验证总结:limit 钳制、provider 输入防抖、status 下拉补 3xx、launcher shim 安装(`ocx codex-shim install`,仅额外覆盖 CLI 启动路径)

## 6. 后续路径

1. **开 PR**:fork `richardfeiliu-a11y/opencodex` 已备份 33 commits;验证通过即可向该 fork 开 PR
2. **上游新版本 rebase**:等上游新版本发布后,把 `feat/usage-analytics` rebase 到新基线(注意上游 main 与 v2.11.0 曾分叉,Phase 1 报告 P2-4 已核实)
3. **切回 npm 稳定版**:本机长期运行用 `ocx service repair` 恢复 npm 稳定版托管(当前由 launchd 服务 `com.opencodex.proxy` 托管开发版)

## 7. 分支/提交状态

- 分支:`feat/usage-analytics` @ `43a42224`(HEAD,`feat(usage): align request-history surface semantics and fix hook reset/retry`)
- 自 v2.11.0 起共 **33 commits**(PR1 后端过滤 / PR2 格式化 / PR3 明细 UI / 5b 5c status 大类 / 6a 6b 修复,及配套测试与 docs 提交)
- 工作区仅剩未跟踪的 `docs/superpowers/test-plans/`(验证用测试计划,未纳入本报告提交)
- launchd 服务 `com.opencodex.proxy` 托管开发版运行中(`http://127.0.0.1:10100`),自愈重启已验证

---

*本报告基于 `.superpowers/sdd/2026-08-09-usage-detail-ui/VERIFICATION-SUMMARY.md` 与三份实施计划撰写;验证明细见该目录下各报告与 progress.md。*
