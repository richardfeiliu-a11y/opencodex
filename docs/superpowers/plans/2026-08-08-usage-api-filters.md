# /api/usage 过滤参数(PR 1)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/api/usage` 支持 provider / model / status / from / to 过滤参数,使 Summary/趋势能与 request-history 明细在同一过滤条件下保持一致。

**Architecture:** 在 `summarizeUsage()` 的既有 `filteredEntries` 链上追加过滤谓词(顶层精确匹配,与 request-history indexer 语义一致);在 `logs-usage-routes.ts` 解析/校验新参数并并入缓存 key。

**Tech Stack:** Bun(TypeScript,ESM),Bun 内置测试框架(`bun:test`),SQLite indexer 只读不改。

## Global Constraints

- `src/` 是 Bun 原生 TypeScript,严格模式,仅 ESM,无独立编译步骤(src/AGENTS.md)。
- 过滤语义必须与 indexer 一致:**顶层精确匹配**(`entry.provider`、`entry.model`),不含 attempts。
- 保持既有 public exports 与配置兼容;新参数全部可选,旧调用行为不变。
- 涉及日志/请求/账户数据,必须跑 `bun run privacy:scan`。
- 共享路由/服务端行为改动,必须跑 `bun run test`(全量)。
- GUI 变更不在本 PR;本 PR 纯后端。
- 版本基线:`feat/usage-analytics`(自 v2.11.0 创建,与 npm 包一致)。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `src/usage/summary.ts` | 修改 | 新增 `UsageSummaryFilters` 类型;`summarizeUsage()` 增加 `filters` 参数并在过滤链上应用 |
| `src/server/management/logs-usage-routes.ts` | 修改 | 解析/校验 `provider/model/status/from/to`;缓存 key 并入过滤条件 |
| `tests/usage-summary.test.ts` | 修改 | `summarizeUsage` 过滤谓词单元测试(provider/model/status/from/to、组合、空结果) |
| `tests/api-usage.test.ts` | 修改 | 路由层测试:参数校验(非法 status/from>to)、缓存隔离、跨端点一致性断言 |
| `tests/helpers/` | 不改 | 复用现有 `managementFetch` / `installIsolatedCodexHome` |
| `docs/superpowers/specs/` | 不改 | Phase 1 报告已含 §8.3/§10.4 设计,本计划即执行依据 |

---

### Task 1: `UsageSummaryFilters` 类型与过滤谓词(summary.ts)

**Files:**
- Modify: `src/usage/summary.ts`(第 7-8 行类型区、第 550 行 `summarizeUsage`、过滤链)
- Test: `tests/usage-summary.test.ts`(新增 describe 块)

**Interfaces:**
- Consumes: `PersistedUsageEntry`(字段:provider/model/requestedModel/status/timestamp/usageStatus)
- Produces:
  - `export interface UsageSummaryFilters { provider?: string; model?: string; status?: number; from?: number; to?: number }`
  - `export function summarizeUsage(entries, range, now, surface = "all", filters?: UsageSummaryFilters): UsageSummary`
  - 返回值 `UsageSummary` 增加可选 `filters?: UsageSummaryFilters`(回显过滤条件)

- [ ] **Step 1: 写失败测试(usage-summary.test.ts)**

在 `tests/usage-summary.test.ts` 末尾新增:

```ts
describe("summarizeUsage filters", () => {
  const base = (over: Partial<import("../src/usage/log").PersistedUsageEntry>) => ({
    requestId: `req-${Math.random().toString(36).slice(2)}`,
    timestamp: 1_800_000_000_000,
    provider: "openai",
    model: "gpt-5.5",
    status: 200,
    durationMs: 10,
    usageStatus: "reported" as const,
    usage: { inputTokens: 10, outputTokens: 5 },
    totalTokens: 15,
    ...over,
  });
  const entries = [
    base({ requestId: "a", provider: "openai", model: "gpt-5.5", status: 200, timestamp: 1_800_000_000_000 }),
    base({ requestId: "b", provider: "anthropic", model: "claude-x", status: 200, timestamp: 1_800_000_000_000 }),
    base({ requestId: "c", provider: "openai", model: "gpt-5.5", status: 503, timestamp: 1_800_000_000_000 }),
    base({ requestId: "d", provider: "openai", model: "gpt-4.5", status: 200, timestamp: 1_800_000_000_000 - 86_400_000 }),
  ];

  test("filters by provider (top-level exact match)", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all", { provider: "openai" });
    expect(s.summary.requests).toBe(3); // a, c, d
    expect(s.filters?.provider).toBe("openai");
  });

  test("filters by model (top-level exact match)", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all", { model: "gpt-5.5" });
    expect(s.summary.requests).toBe(2); // a, c
  });

  test("filters by status", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all", { status: 503 });
    expect(s.summary.requests).toBe(1); // c
  });

  test("filters by from/to timestamp", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all",
      { from: 1_800_000_000_000 - 1, to: 1_800_000_000_000 });
    expect(s.summary.requests).toBe(3); // a, b, c (d older than from)
  });

  test("combines filters", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all",
      { provider: "openai", model: "gpt-5.5", status: 200 });
    expect(s.summary.requests).toBe(1); // a
  });

  test("empty result when no match", () => {
    const s = summarizeUsage(entries, "all", 1_800_000_000_000, "all", { provider: "nobody" });
    expect(s.summary.requests).toBe(0);
    expect(s.summary.totalTokens).toBe(0);
  });

  test("no filters behaves exactly as before", () => {
    const withFilters = summarizeUsage(entries, "all", 1_800_000_000_000, "all", undefined);
    const without = summarizeUsage(entries, "all", 1_800_000_000_000, "all");
    expect(withFilters.summary.requests).toBe(without.summary.requests);
    expect(withFilters.summary.totalTokens).toBe(without.summary.totalTokens);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd ~/Projects/opencodex-dev/opencodex
bun test tests/usage-summary.test.ts
```

Expected: FAIL — `summarizeUsage` 不接受第 5 个参数(TS 编译错)或 `filters` 未定义。

- [ ] **Step 3: 实现(summary.ts)**

在类型区(第 8 行 `UsageSurface` 后)新增:

```ts
/** 可选过滤条件,语义与 request-history indexer 一致:顶层精确匹配,不含 attempts。 */
export interface UsageSummaryFilters {
  provider?: string;
  model?: string;
  status?: number;
  from?: number;
  to?: number;
}
```

在 `UsageSummary` 接口(约第 54 行)增加回显字段:

```ts
  /** 回显本次请求使用的过滤条件;无过滤时为 undefined。 */
  filters?: UsageSummaryFilters;
```

修改 `summarizeUsage` 签名与过滤链:

```ts
export function summarizeUsage(
  entries: PersistedUsageEntry[],
  range: UsageRange,
  now: number,
  surface: UsageSurface = "all",
  filters?: UsageSummaryFilters,
): UsageSummary {
  const { since } = rangeWindow(range, now);
  const filteredEntries = entries.filter(entry => {
    if (since !== null && entry.timestamp < since) return false;
    if (surface === "claude") return entry.surface === "claude" || entry.surface === "claude-desktop";
    if (surface === "grok") return entry.surface === "grok";
    if (surface === "codex") return entry.surface === undefined;
    // 新增:可选过滤条件(顶层精确匹配,与 indexer 一致)
    if (filters?.provider !== undefined && entry.provider !== filters.provider) return false;
    if (filters?.model !== undefined && entry.model !== filters.model) return false;
    if (filters?.status !== undefined && entry.status !== filters.status) return false;
    if (filters?.from !== undefined && entry.timestamp < filters.from) return false;
    if (filters?.to !== undefined && entry.timestamp > filters.to) return false;
    return true;
  });
  // ... 其余不变
  return {
    range,
    surface,
    since,
    generatedAt: now,
    ...(filters ? { filters } : {}),
    summary: totals,
    days: buildDayGrid(range, since, now, filteredEntries),
    models: buildModels(filteredEntries, totals.totalTokens),
    providers: buildProviders(filteredEntries, totals.totalTokens),
  };
}
```

> 说明:`model` 过滤匹配 `entry.model`(顶层,即 resolved model),与 indexer `model = ?` 一致。`requestedModel` 过滤不在本 PR(报告 §8.3 方案 A 只要求 provider/model/status/from/to;requestedModel 属于 P1 增强)。

- [ ] **Step 4: 运行确认通过**

```bash
bun test tests/usage-summary.test.ts
```

Expected: PASS(新增 7 个过滤测试 + 既有测试不回归)。

- [ ] **Step 5: 提交**

```bash
git add src/usage/summary.ts tests/usage-summary.test.ts
git commit -m "feat(usage): add provider/model/status/from/to filters to summarizeUsage"
```

---

### Task 2: 路由参数解析/校验 + 缓存 key 扩展(logs-usage-routes.ts)

**Files:**
- Modify: `src/server/management/logs-usage-routes.ts`(`/api/usage` 处理块,约第 187-217 行)
- Test: `tests/api-usage.test.ts`(新增 describe 块)

**Interfaces:**
- Consumes: `parseRange` / `parseUsageSurface` / `summarizeUsage` / `UsageSummaryFilters`(Task 1 产出);`getUsageSummaryCacheEntry` / `setUsageSummaryCacheEntry` / `discardUsageSummaryCacheEntry`
- Produces: `/api/usage` 支持 `provider` / `model` / `status` / `from` / `to` 查询参数;非法值返回 400;缓存 key 含过滤条件

- [ ] **Step 1: 写失败测试(api-usage.test.ts)**

在 `tests/api-usage.test.ts` 的 `describe("GET /api/usage", ...)` 块内追加(注意复用既有 `writeFixture`):

```ts
test("accepts provider/model/status/from/to filters", async () => {
  writeFixture(Date.now());
  const res = await fetch("/api/usage?range=all&provider=openai&model=gpt-5.5&status=200");
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.filters).toEqual({ provider: "openai", model: "gpt-5.5", status: 200 });
  // fixture 中 provider=openai && model=gpt-5.5 && status=200 的只有 ocx-old 和 ocx-recent 两条
  expect(body.summary.requests).toBe(2);
});

test("rejects invalid status", async () => {
  const res = await fetch("/api/usage?status=abc");
  expect(res.status).toBe(400);
});

test("rejects status out of 100-599 range", async () => {
  const res = await fetch("/api/usage?status=99");
  expect(res.status).toBe(400);
});

test("rejects from > to", async () => {
  const res = await fetch("/api/usage?from=2000&to=1000");
  expect(res.status).toBe(400);
});

test("cache key isolates different filters", async () => {
  writeFixture(Date.now());
  const a = await (await fetch("/api/usage?range=all&provider=openai")).json();
  const b = await (await fetch("/api/usage?range=all&provider=anthropic")).json();
  // 若缓存 key 未隔离,第二次请求会错误复用第一次结果
  expect(a.summary.requests).toBe(2); // openai: ocx-old, ocx-recent
  expect(b.summary.requests).toBe(1); // anthropic: ocx-missing
});
```

> 注:`writeFixture` 的 now 参数在既有测试中通过 `writeFixture(Date.now())` 调用;`ocx-old` timestamp 为 `now - 10d`,`ocx-recent`/`ocx-missing` 为 `now - 1d`。provider=openai 共 2 条(ocx-old, ocx-recent),provider=anthropic 共 1 条(ocx-missing)。

- [ ] **Step 2: 运行确认失败**

```bash
bun test tests/api-usage.test.ts
```

Expected: FAIL — 新参数被忽略(返回 200 且 `filters` 缺失)或 400 未实现。

- [ ] **Step 3: 实现(logs-usage-routes.ts)**

在 `import` 区(第 57 行)补充导入:

```ts
import { parseRange, parseUsageSurface, summarizeUsage, type UsageRange, type UsageSummary, type UsageSurface, type UsageSummaryFilters } from "../../usage/summary";
```

在 `handleLogsUsageRoutes` 的 `/api/usage` 块(第 187 行起)内,`const surface = ...` 之后新增解析/校验:

```ts
  if (url.pathname === "/api/usage" && req.method === "GET") {
    const range = parseRange(url.searchParams.get("range"));
    const surface = parseUsageSurface(url.searchParams.get("surface"));
    // 新增:可选过滤条件解析与校验
    const filters: UsageSummaryFilters = {};
    const provider = url.searchParams.get("provider")?.trim();
    if (provider) filters.provider = provider;
    const model = url.searchParams.get("model")?.trim();
    if (model) filters.model = model;
    const statusRaw = url.searchParams.get("status");
    if (statusRaw !== null) {
      const status = Number(statusRaw);
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        return jsonResponse({ error: { code: "invalid_status", message: "status must be an integer from 100 to 599" } }, 400, req, config);
      }
      filters.status = status;
    }
    const fromRaw = url.searchParams.get("from");
    if (fromRaw !== null) {
      const from = Number(fromRaw);
      if (!Number.isInteger(from) || from < 0) {
        return jsonResponse({ error: { code: "invalid_from", message: "from must be a non-negative integer timestamp" } }, 400, req, config);
      }
      filters.from = from;
    }
    const toRaw = url.searchParams.get("to");
    if (toRaw !== null) {
      const to = Number(toRaw);
      if (!Number.isInteger(to) || to < 0) {
        return jsonResponse({ error: { code: "invalid_to", message: "to must be a non-negative integer timestamp" } }, 400, req, config);
      }
      filters.to = to;
    }
    if (filters.from !== undefined && filters.to !== undefined && filters.from > filters.to) {
      return jsonResponse({ error: { code: "invalid_range", message: "from must not be after to" } }, 400, req, config);
    }
    const hasFilters = Object.keys(filters).length > 0;
    const filtersKey = hasFilters ? JSON.stringify(filters) : "";
    const now = Date.now();
    try {
      // 缓存 key 并入过滤条件(不同过滤不串缓存)
      const cacheKey = `${range}:${surface}\0${filtersKey}`;
```

后续 `summarizeUsage` 调用改为:

```ts
        ...summarizeUsage(snapshot.entries, range, now, surface, hasFilters ? filters : undefined),
```

> 注:`jsonResponse` 与 `req`/`config` 均已在此函数作用域可用(第 187-188 行上下文已使用)。

- [ ] **Step 4: 运行确认通过**

```bash
bun test tests/api-usage.test.ts
```

Expected: PASS(新增 5 个测试 + 既有测试不回归)。

- [ ] **Step 5: 提交**

```bash
git add src/server/management/logs-usage-routes.ts tests/api-usage.test.ts
git commit -m "feat(usage): accept provider/model/status/from/to filters on /api/usage with isolated cache keys"
```

---

### Task 3: 跨端点一致性断言(§14.2b,路由层)

**Files:**
- Modify: `tests/api-usage.test.ts`(追加一致性测试)

**Interfaces:**
- Consumes: `/api/usage`(Task 2 产出)与 `/api/request-history`(既有,v2.11.0 存在)
- Produces: 验证同一过滤下两个端点计数一致的回归保护

- [ ] **Step 1: 写失败测试**

在 `tests/api-usage.test.ts` 追加:

```ts
describe("filter consistency across /api/usage and /api/request-history", () => {
  test("same provider filter yields same request count on both endpoints", async () => {
    const now = Date.now();
    writeFixture(now);
    const usageRes = await fetch("/api/usage?range=all&provider=openai");
    const usageBody = await usageRes.json();

    // 翻完 request-history 所有页,累计行数
    let total = 0;
    let cursor: string | undefined;
    do {
      const url = "/api/request-history?provider=openai&limit=100" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const rh = await (await fetch(url)).json();
      total += rh.entries.length;
      cursor = rh.nextCursor;
    } while (cursor);

    expect(usageBody.summary.requests).toBe(total);
  });

  test("same status filter yields same request count on both endpoints", async () => {
    const now = Date.now();
    writeFixture(now);
    const usageRes = await fetch("/api/usage?range=all&status=503");
    const usageBody = await usageRes.json();
    let total = 0;
    let cursor: string | undefined;
    do {
      const url = "/api/request-history?status=503&limit=100" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const rh = await (await fetch(url)).json();
      total += rh.entries.length;
      cursor = rh.nextCursor;
    } while (cursor);
    expect(usageBody.summary.requests).toBe(total);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
bun test tests/api-usage.test.ts
```

Expected: FAIL(在 Task 2 完成前,`/api/usage` 忽略 provider 过滤,usageBody.summary.requests 为全集 ≠ request-history 过滤后行数)。

- [ ] **Step 3: 确认通过(依赖 Task 1+2 已实现)**

```bash
bun test tests/api-usage.test.ts
```

Expected: PASS(此时 /api/usage 已支持过滤,两个端点计数一致)。

> 说明:此测试在 Task 2 完成后本应已通过;Task 3 的意义是把它固化为一等回归保护,并显式覆盖"provider 过滤顶层精确匹配"语义。

- [ ] **Step 4: 提交**

```bash
git add tests/api-usage.test.ts
git commit -m "test(usage): assert filter-consistency between /api/usage and /api/request-history"
```

---

### Task 4: 全量验证与合规检查

**Files:** 无(仅运行命令)

- [ ] **Step 1: 全量测试**

```bash
bun run test
```

Expected: 全部 PASS,无回归。

- [ ] **Step 2: 类型检查**

```bash
bun run typecheck
```

Expected: tsc --noEmit 无错误。

- [ ] **Step 3: 隐私扫描(涉及日志/请求/账户数据)**

```bash
bun run privacy:scan
```

Expected: 通过,无新增隐私泄露。

- [ ] **Step 4: 手动验证 API 行为(可选,本机服务未启动时跳过)**

若 10100 服务仍在跑 npm 版(旧代码),此改动不会生效;如要验证新行为,按 §15.5 切换到开发实例后再 curl:

```bash
curl 'http://127.0.0.1:PORT/api/usage?range=all&provider=openai&status=200'
```

- [ ] **Step 5: 提交前检查与总结**

```bash
git status
git log --oneline -4
```

Expected: 工作区干净,3 个提交(过滤类型/路由+缓存/一致性测试)。

---

## Self-Review(写作自查)

- **Spec 覆盖**:§8.3 方案 A(类型+路由+缓存)✅ Task 1/2;§14.2b 一致性断言 ✅ Task 3;§14.1 单测(格式化/日期/序列化等为 PR 2 范围)✅ 不越界;§15 风险 5 顶层精确匹配 ✅ 在 Task 1 注释与测试中固化。
- **占位符扫描**:无 TBD/TODO;每个 Step 含具体代码与命令。
- **类型一致性**:`UsageSummaryFilters` 在 Task 1 定义、Task 2 消费;`summarizeUsage` 签名 Task 1 产出、Task 2 调用——一致。
- **范围**:本 PR 不含 requestedModel 过滤、不含小时聚合、不含 GUI 改动(均明确 deferred)。
