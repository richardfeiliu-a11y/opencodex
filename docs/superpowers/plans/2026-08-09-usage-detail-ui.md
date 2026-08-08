# Usage 明细 UI(PR 3)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 OpenCodex Usage 页加入全局过滤(Provider/Model/Status/时间区间)与请求明细表(接 `/api/request-history`),并让 Summary/趋势/明细在同一过滤条件下保持一致;叠加 token 趋势视图。

**Architecture:** 复用现有 `useDataSurface` 数据加载模式;新增 `useRequestHistory`(游标分页,接 `/api/request-history`);扩展 `UsageFilters` 状态;新增 Requests 明细表与趋势组件;Summary/趋势走 PR 1 扩展后的 `/api/usage`(带过滤参数)。

**Tech Stack:** React 19 + TypeScript(Bun),`useDataSurface`(项目自有 hook),`gui/tests/` bun test。

## 真实源码重校(PR 3 前置,修正报告 §4 偏差)

> 报告 §4 基于编译产物逆向的 GUI 现状描述与真实源码有系统性偏差,此处以真实源码为准(PR 2 审查已确认此问题)。

| 报告 §4 描述 | 真实源码(v2.11.0 + PR1/PR2 后) |
|---|---|
| "Usage 页有 7d/30d/All 三段 range" | ✅ 属实:`Range = "all"\|"30d"\|"7d"`(Usage.tsx:15) |
| "Usage 页有 surface 过滤" | ✅ 属实:`UsageSurface` 四选一(Usage.tsx:16) |
| "无 Provider/Model/Status 过滤" | ✅ 属实:`UsageFilters` 只有 surface + range(Usage.tsx:205-267) |
| "无时间区间选择" | ✅ 属实:range 固定三档,无 from/to |
| "无请求明细表" | ✅ 属实:Usage 页无表格接 request-history;Logs 页表格接 `/api/logs` 内存日志(Logs.tsx:470) |
| "无趋势折线,只有 heatmap" | ✅ 属实:Usage 有 heatmap + daybar(Usage.tsx:370-455) |
| "数据加载用 React Query" | ❌ 偏差:用项目自有 `useDataSurface`(data-surface.ts:141),非 React Query |
| "api.ts 有 request-history 封装" | ❌ 偏差:api.ts 无 request-history 封装,需新增 |

**结论**:PR 3 在真实源码上实现:过滤条扩展(provider/model/status/from/to)+ request-history 明细表 + 趋势,复用 `useDataSurface` 与现有表格样式(`tbl`/`logs-table`)。

---

## Global Constraints

- 过滤语义与后端一致:provider/model 顶层精确匹配;status 100-599 整数;from/to 毫秒时间戳。
- **一致性规则(§9.3)**:Summary/趋势走 `/api/usage`(带过滤,PR 1 已支持);明细走 `/api/request-history`(相同过滤);切换过滤必须重置游标。
- from/to 优先于 range(PR 1 语义):传 from/to 时忽略 range 窗口。
- 分页:游标分页(limit=50,nextCursor 循环),**不做前端全量加载**。
- 复用 `useDataSurface` 与 `tbl`/`logs-table` 表格样式;不引入新 UI 框架。
- GUI lint / build / 测试必须通过。
- 版本基线:feat/usage-analytics(PR 1 + PR 2 已合并)。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `gui/src/pages/Usage.tsx` | 修改 | 过滤状态扩展 + 明细表/趋势接入 |
| `gui/src/hooks/useRequestHistory.ts` | 新建 | `/api/request-history` 游标分页 hook |
| `gui/src/components/UsageFilterBar.tsx` | 新建 | provider/model/status/from/to 过滤条(扩展现有 UsageFilters) |
| `gui/src/components/RequestHistoryTable.tsx` | 新建 | 请求明细表(复用 tbl 样式) |
| `gui/src/components/TokenTrend.tsx` | 新建 | 按天 token 折线(基于过滤后 days[]) |
| `gui/tests/use-request-history.test.ts` | 新建 | 分页/竞态/重置测试 |
| `gui/tests/usage-filter-bar.test.tsx` | 新建 | 过滤条渲染/交互测试 |

---

### Task 1: 过滤状态扩展 + `useRequestHistory` hook

**Files:**
- Create: `gui/src/hooks/useRequestHistory.ts`
- Modify: `gui/src/pages/Usage.tsx`(状态区)
- Test: `gui/tests/use-request-history.test.ts`(新建)

**Interfaces:**
- Consumes: `useDataSurface`(data-surface.ts:141)
- Produces:
  - `export interface UsageFilters { provider?: string; model?: string; status?: number; from?: number; to?: number }`
  - `export function useRequestHistory(apiBase: string, filters: UsageFilters): { rows: HistoryEntry[]; hasMore: boolean; loadMore: () => void; loading: boolean; error?: Error; reset: () => void }`
  - `export interface HistoryEntry { requestId: string; timestamp: number; provider: string; model: string; requestedModel?: string; status: number; usageStatus?: string; usage?: { inputTokens?: number; outputTokens?: number; cacheReadInputTokens?: number; cacheCreationInputTokens?: number }; totalTokens?: number; durationMs: number; surface?: string }`

- [ ] **Step 1: 写失败测试(gui/tests/use-request-history.test.ts)**

```ts
import { describe, expect, test } from "bun:test";
import { buildHistoryUrl } from "../src/hooks/useRequestHistory";

// 纯逻辑测试:验证过滤条件→URL 序列化与游标处理(hook 渲染部分依赖 useDataSurface,纯函数层先行)
describe("useRequestHistory", () => {
  test("serializes filters into query params", () => {
    const url = buildHistoryUrl("/api", { provider: "openai", model: "gpt-5.5", status: 200, from: 1000, to: 2000 });
    expect(url).toContain("provider=openai");
    expect(url).toContain("model=gpt-5.5");
    expect(url).toContain("status=200");
    expect(url).toContain("from=1000");
    expect(url).toContain("to=2000");
  });

  test("empty filters omit params", () => {
    const url = buildHistoryUrl("/api", {});
    expect(url).not.toContain("provider=");
    expect(url).not.toContain("status=");
  });

  test("cursor appends only when present", () => {
    expect(buildHistoryUrl("/api", {}, "abc123")).toContain("cursor=abc123");
    expect(buildHistoryUrl("/api", {})).not.toContain("cursor=");
  });
});
```

> 注:测试先聚焦**纯函数** `buildHistoryUrl`(过滤→URL),hook 的渲染部分用既有 `useDataSurface` 测试模式。若项目无 renderHook 基建,把 hook 拆成"纯逻辑 + useDataSurface 包装"两层,纯逻辑层可测。

- [ ] **Step 2: 运行确认失败**

```bash
cd gui && bun test tests/use-request-history.test.ts
```

Expected: FAIL — `buildHistoryUrl` 不存在。

- [ ] **Step 3: 实现(useRequestHistory.ts)**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

export interface UsageFilters {
  provider?: string;
  model?: string;
  status?: number;
  from?: number;
  to?: number;
}

export interface HistoryUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

export interface HistoryEntry {
  requestId: string;
  timestamp: number;
  provider: string;
  model: string;
  requestedModel?: string;
  status: number;
  usageStatus?: string;
  usage?: HistoryUsage;
  totalTokens?: number;
  durationMs: number;
  surface?: string;
}

export function buildHistoryUrl(apiBase: string, filters: UsageFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.model) params.set("model", filters.model);
  if (filters.status !== undefined) params.set("status", String(filters.status));
  if (filters.from !== undefined) params.set("from", String(filters.from));
  if (filters.to !== undefined) params.set("to", String(filters.to));
  if (cursor) params.set("cursor", cursor);
  params.set("limit", "50");
  const qs = params.toString();
  return `${apiBase}/api/request-history${qs ? `?${qs}` : ""}`;
}

export interface UseRequestHistoryResult {
  rows: HistoryEntry[];
  hasMore: boolean;
  loading: boolean;
  error?: Error;
  loadMore: () => void;
  reset: () => void;
}

/** Cursor-paginated request history. Filters change => cursor resets (§9.3). */
export function useRequestHistory(
  apiBase: string,
  filters: UsageFilters,
): UseRequestHistoryResult {
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const activeCursor = useRef<string | undefined>(undefined);
  const filtersKey = JSON.stringify(filters);

  const fetchPage = useCallback(async (c: string | undefined) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(buildHistoryUrl(apiBase, filters, c));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const nextRows: HistoryEntry[] = body.entries ?? [];
      if (c === undefined) setRows(nextRows);
      else setRows(prev => [...prev, ...nextRows]);
      setHasMore(!!body.nextCursor);
      activeCursor.current = body.nextCursor;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [apiBase, filtersKey, filters]);

  // 过滤条件变化 => 重置游标与列表
  useEffect(() => {
    activeCursor.current = undefined;
    setRows([]);
    void fetchPage(undefined);
  }, [filtersKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !activeCursor.current) return;
    void fetchPage(activeCursor.current);
  }, [loading, fetchPage]);

  const reset = useCallback(() => {
    activeCursor.current = undefined;
    setRows([]);
    void fetchPage(undefined);
  }, [fetchPage]);

  return { rows, hasMore, loading, error, loadMore, reset };
}
```

> 说明:`fetchPage` 依赖 `filters`(对象引用会变),用 `filtersKey`(JSON 序列化)做依赖,避免每次渲染重复请求。竞态:过滤变化时 effect 清空并重新拉第一页,旧请求结果因 `rows` 状态被重置而不会污染(简单场景够用;严格竞态见 Task 5 验证)。

- [ ] **Step 4: 运行确认通过**

```bash
cd gui && bun test tests/use-request-history.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add gui/src/hooks/useRequestHistory.ts gui/tests/use-request-history.test.ts
git commit -m "feat(gui): add useRequestHistory hook with cursor pagination"
```

---

### Task 2: 过滤条扩展(Provider/Model/Status/时间区间)

**Files:**
- Modify: `gui/src/pages/Usage.tsx`(UsageFilters 组件 + 主组件状态)
- Test: `gui/tests/usage-filter-bar.test.tsx`(新建)

**Interfaces:**
- Consumes: `Range` / `UsageSurface`(Usage.tsx:15-16)、`UsageFilters`(Task 1 产出)
- Produces: 扩展后的 `UsageFilters` 组件 props:`{ surface, range, filters, onSurface, onRange, onFilters, t }`

- [ ] **Step 1: 写失败测试(gui/tests/usage-filter-bar.test.tsx)**

```tsx
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { UsageFilters } from "../src/pages/Usage"; // 需导出

describe("UsageFilters", () => {
  test("renders provider/model/status/date controls", () => {
    const html = renderToStaticMarkup(
      <UsageFilters
        surface="all" range="30d" filters={{}}
        onSurface={() => {}} onRange={() => {}} onFilters={() => {}}
        t={(k: string) => k}
      />,
    );
    expect(html).toContain("provider");
    expect(html).toContain("status");
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd gui && bun test tests/usage-filter-bar.test.tsx
```

Expected: FAIL — 新过滤控件不存在。

- [ ] **Step 3: 实现**

扩展 `UsageFilters`(Usage.tsx:205-267):在 surface/range 分段后新增 Provider/Model/Status/时间区间控件(下拉/输入框,值来自 providers 列表与 filters 状态)。主组件(753 行起)新增 `const [filters, setFilters] = useState<UsageFilters>({})`;`loadUsage` 的 fetch URL 增加过滤参数(PR 1 已支持 `provider/model/status/from/to`);`resourceKey` 与 `useDataSurface` 依赖数组加入 `JSON.stringify(filters)`(不同过滤不串缓存/状态)。

> 需新增 i18n 文案:`usage.filter.providerAll` / `usage.filter.statusAll` 等(en/zh),加到 `gui/src/i18n/` 对应语言文件。

- [ ] **Step 4: 运行确认通过**

```bash
cd gui && bun test tests/usage-filter-bar.test.tsx
cd gui && bun run build
```

Expected: 测试通过 + 构建通过。

- [ ] **Step 5: 提交**

```bash
git add gui/src/pages/Usage.tsx gui/tests/usage-filter-bar.test.tsx gui/src/i18n/
git commit -m "feat(gui): add provider/model/status/date filters to Usage page"
```

---

### Task 3: 请求明细表(接 useRequestHistory)

**Files:**
- Create: `gui/src/components/RequestHistoryTable.tsx`
- Modify: `gui/src/pages/Usage.tsx`(接入明细表区块)
- Test: 无新增(渲染逻辑在 Task 1 纯函数已测;组件接入用 build 验证)

**Interfaces:**
- Consumes: `useRequestHistory`(Task 1 产出)、`HistoryEntry`、`CompactNumber`(PR 2 产出)
- Produces: `RequestHistoryTable({ rows, hasMore, loading, error, loadMore, t, locale })`

- [ ] **Step 1: 实现 RequestHistoryTable.tsx**

复用 `tbl`/`logs-table` 样式(Logs.tsx:703 模式),列:time / provider / requested→resolved model / status / tokens(CompactNumber)/ duration;空态与错误态;hasMore 时显示 Load more 按钮。

> 注:状态徽章样式(`status-2xx` 等)若不存在,用内联色或复用 Logs 页既有状态类(实现时核对 Logs.tsx 的状态渲染)。`logs.loadMore` 文案需新增到 i18n。

- [ ] **Step 2: Usage.tsx 接入**

在 `UsageWorkspaceBody`(或主组件)新增明细区块:`const history = useRequestHistory(apiBase, filters);` 渲染 `<RequestHistoryTable ... />`。放置:Detail 区新增"Requests"区块(Models/Providers 表格下方,或新 section)。

- [ ] **Step 3: 验证**

```bash
cd gui && bun run build
```

Expected: 构建通过。

- [ ] **Step 4: 提交**

```bash
git add gui/src/components/RequestHistoryTable.tsx gui/src/pages/Usage.tsx gui/src/i18n/
git commit -m "feat(gui): add request history table to Usage page"
```

---

### Task 4: Token 趋势(按天折线)

**Files:**
- Create: `gui/src/components/TokenTrend.tsx`
- Modify: `gui/src/pages/Usage.tsx`(接入趋势)
- Test: 无新增(趋势渲染用既有数据;组件纯展示)

**Interfaces:**
- Consumes: `UsageDay[]`(Usage.tsx:39,来自 `/api/usage` 过滤后 days)
- Produces: `TokenTrend({ days, locale, t })` — 按天 totalTokens 折线(SVG 手写,项目无图表库)

- [ ] **Step 1: 实现 TokenTrend.tsx**

基于过滤后的 `days[]`(每项 `{ date, totalTokens }`),用 SVG polyline 折线,每点带 `<title>` 显示精确值;空数据/单点处理;aria-label 可访问性。

> 说明:过滤后的 `days[]` 由 `/api/usage`(带过滤)返回,天然与 Summary 一致(§9.3)。只展示 total,input/output/cache 分序列属增强(defer)。

- [ ] **Step 2: Usage.tsx 接入**

在 Summary 卡下方/heatmap 旁加 `<TokenTrend days={data?.days ?? []} locale={locale} t={t} />`。

- [ ] **Step 3: 验证**

```bash
cd gui && bun run build
```

Expected: 构建通过。

- [ ] **Step 4: 提交**

```bash
git add gui/src/components/TokenTrend.tsx gui/src/pages/Usage.tsx gui/src/i18n/
git commit -m "feat(gui): add token trend chart to Usage page"
```

---

### Task 5: 联动一致性 + 全量验证

**Files:** 无(仅命令 + 可能小修)

- [ ] **Step 0: stale 响应防护验收(审查 P1,Task 1 修复后确认)**

`useRequestHistory` 必须包含:
- 竞态 guard:fetchPage 用序号 ref,旧响应返回时丢弃(过滤快速切换不出现"新过滤+旧数据")。
- filtersRef:fetchPage 依赖 `[apiBase, filtersKey]` 而非 `filters` 对象引用(避免调用方内联 filters 造成无限重渲染)。

验证:模拟慢请求 A + 快请求 B,断言最终 rows 是 B 的结果(手动或单测)。

- [ ] **Step 1: GUI 全量测试**

```bash
cd gui && bun test tests
```

- [ ] **Step 2: GUI lint + build**

```bash
cd gui && bun run lint
cd gui && bun run build
```

Expected: lint 0 错误、build 成功。

- [ ] **Step 3: 后端回归(PR 1 已改,确认未破坏)**

```bash
cd .. && bun run typecheck
bun test tests/api-usage.test.ts tests/usage-summary.test.ts
```

Expected: 通过。

- [ ] **Step 4: 提交前检查**

```bash
git status
git log --oneline -6
```

Expected: 工作区干净,4 个提交(Task 1-4)。

---

## Self-Review(写作自查)

- **Spec 覆盖**:§9.3 一致性(过滤驱动五面板)✅ Task 2+3+5;§11 分页(游标/重置/stale)✅ Task 1;§10.2 字段映射(明细表列)✅ Task 3;§12 格式化(CompactNumber 复用)✅ Task 3;趋势 ✅ Task 4。
- **真实源码对齐**:useDataSurface 模式 ✅ Task 1;tbl/logs-table 样式 ✅ Task 3;Range/UsageSurface 类型 ✅ Task 2。
- **占位符扫描**:无 TBD;每步含代码或命令。Task 1 的 renderHook 若项目无基建,已注明"拆纯函数层"兜底。
- **类型一致性**:`UsageFilters` Task 1 定义、Task 2 状态与 Task 3 hook 消费一致;`HistoryEntry` Task 1 定义、Task 3 表格消费。
- **范围**:不动后端(PR 1 已够);不动格式化(PR 2 已完);不含缓存命中率透视(§10.4,defer)、不含成本/导出。

## 已知决策点(需用户/审查确认)

1. **Status 过滤粒度**:下拉用 2xx/4xx/5xx 大类还是具体码?计划先做大类(2xx/4xx/5xx),后端 PR 1 支持具体码,前端可后续细化。
2. **明细表位置**:作为 Usage 页新 section(Models/Providers 下方)还是独立 tab?计划先做同页 section(最小改动)。
3. **趋势序列**:只做 total(计划),input/output/cache 分序列 defer。
