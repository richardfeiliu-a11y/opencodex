# Token 格式化层(PR 2)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GUI 的 token 大数字格式化从"1 位小数"升级为"最多 2 位小数 + 精确值可达",并提供统一 `<CompactNumber>` 组件承载精确值 tooltip,满足报告 §12 的格式化规范。

**Architecture:** 改造共享格式化器 `formatTokens()`(1e4 阈值、K/M/B/T)为 §12.1 规范;新增 `CompactNumber` React 组件(展示紧凑值 + title 精确值);`formatRequestCount()`/`formatTokenCount()` 同步对齐小数位;调用点选择性接入 tooltip(优先 Usage 卡与 Logs 表)。

**Tech Stack:** React 19 + TypeScript(Bun),`gui/tests/` 用 bun test 跑组件测试(既有 `gui/tests/*.test.tsx` 基建)。

## Global Constraints

- 阈值保持:`formatTokens` 维持 1e4 阈值(与 CJK 万/亿 刻度一致,§12.3);`formatRequestCount` 维持 1e3 阈值(德语 Tsd./Mio./Mrd.)。
- 小数位规范(§12.1):最多 2 位,去尾零;`value/suffix` 为整数时 0 位(如 1,000→1K、100,000,000→100M)。
- 精确值始终可达:紧凑显示必须伴随 `title`/`aria-label` 的精确整数值(千分位);无 UI 上下文处(纯文本)至少保留完整整数值。
- 不破坏 CJK 分支(ko/zh 万/亿/兆/京)与德语分支(Mrd./Mio./Tsd.)。
- 货币格式化 `formatEstimatedUsdValue` 不动(§12.2 明确保留)。
- GUI lint 必须通过:`cd gui && bun run lint`;构建:`cd gui && bun run build`。
- 测试:`cd gui && bun test tests`(gui 测试);后端不受本 PR 影响。
- 版本基线:`feat/usage-analytics`(PR 1 已合并到该分支)。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `gui/src/format-tokens.ts` | 修改 | `formatTokens()` 小数位 1 → 最多 2;新增导出 `formatTokensExact()`(千分位完整整数,供 tooltip) |
| `gui/src/components/CompactNumber.tsx` | 新建 | 展示紧凑值 + `title`/`aria-label` 精确值 |
| `gui/src/provider-workspace/usage.ts` | 修改 | `formatRequestCount()` 小数位对齐(≤2 位去尾零),德语分支保留 |
| `gui/src/pages/Usage.tsx` | 修改 | 关键大数字(卡、热力图、breakdown 表)接入 `CompactNumber` |
| `gui/src/pages/Logs.tsx` | 修改 | 明细 token 列接入 `CompactNumber`(可选,先做 usage 列) |
| `gui/tests/format-tokens.test.ts` | 新建 | §12.4 全边界单测 |
| `gui/tests/compact-number.test.tsx` | 新建 | CompactNumber 渲染 + tooltip 测试 |

---

### Task 1: `formatTokens()` 小数位规范 + `formatTokensExact()`

**Files:**
- Modify: `gui/src/format-tokens.ts`
- Test: `gui/tests/format-tokens.test.ts`(新建)

**Interfaces:**
- Consumes: 无(纯函数,输入 `n: number, locale: string`)
- Produces:
  - `export function formatTokens(n: number, locale: string): string` — §12.1 规范
  - `export function formatTokensExact(n: number): string` — 千分位完整整数(如 `1,234,567`)

- [ ] **Step 1: 写失败测试(gui/tests/format-tokens.test.ts)**

```ts
import { describe, expect, test } from "bun:test";
import { formatTokens, formatTokensExact } from "../src/format-tokens";

describe("formatTokens", () => {
  // §12.4 边界值(英文 locale)
  test("en: below 10k stays as-is", () => {
    expect(formatTokens(999, "en")).toBe("999");
  });
  test("en: 1,000 -> 1000 (below 10k threshold, shown as-is)", () => {
    // §12.3 保持 formatTokens 的 1e4 阈值:1,000 未达 10K,原样显示。
    // (报告 §12.1 表格的 "1K" 基于 br() 的 1e3 阈值;真实主格式化器 formatTokens 是 1e4 阈值。)
    expect(formatTokens(1000, "en")).toBe("1000");
  });
  test("en: 12,340 -> 12.34K (2 decimals)", () => {
    expect(formatTokens(12340, "en")).toBe("12.34K");
  });
  test("en: 999,999 -> 999.99K (not rounded to 1M)", () => {
    expect(formatTokens(999999, "en")).toBe("999.99K");
  });
  // 跨档边界(审查 P1):四舍五入会让 999.999 进位到 1000,必须截断
  test("en: 99,999,999 -> 99.99M (not rounded to 100M)", () => {
    expect(formatTokens(99999999, "en")).toBe("99.99M");
  });
  test("en: 999,999,999 -> 999.99M (not rounded to 1B)", () => {
    expect(formatTokens(999999999, "en")).toBe("999.99M");
  });
  test("en: 1,000,000 -> 1M", () => {
    expect(formatTokens(1000000, "en")).toBe("1M");
  });
  test("en: 100,000,000 -> 100M (integer)", () => {
    expect(formatTokens(100000000, "en")).toBe("100M");
  });
  test("en: 128,394,822 -> 128.39M", () => {
    expect(formatTokens(128394822, "en")).toBe("128.39M");
  });
  test("en: 1,000,000,000 -> 1B", () => {
    expect(formatTokens(1000000000, "en")).toBe("1B");
  });
  test("en: 1,234,567,890 -> 1.23B", () => {
    expect(formatTokens(1234567890, "en")).toBe("1.23B");
  });
  test("en: zero and negative are stable", () => {
    expect(formatTokens(0, "en")).toBe("0");
    expect(formatTokens(-5, "en")).toBe("-5");
  });
  // CJK 分支不回归
  test("zh: 12,340 -> 1.23万 (myriad scale preserved)", () => {
    expect(formatTokens(12340, "zh")).toBe("1.23万");
  });
  test("zh: 1,234,567 -> 123.45万 (truncated, not rounded)", () => {
    expect(formatTokens(1234567, "zh")).toBe("123.45万");
  });
  // 千分位精确值
  test("exact: 1,234,567 -> 1,234,567", () => {
    expect(formatTokensExact(1234567)).toBe("1,234,567");
  });
  test("exact: 0 -> 0", () => {
    expect(formatTokensExact(0)).toBe("0");
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd gui && bun test tests/format-tokens.test.ts
```

Expected: FAIL — 当前 `formatTokens` 输出 `12.3K`(1 位)而非 `12.34K`;`formatTokensExact` 不存在。

- [ ] **Step 3: 实现(format-tokens.ts)**

将小数位逻辑改为"最多 2 位、去尾零、整数 0 位",并新增精确值函数:

```ts
/** Trim trailing zeros so 12.34K stays, but 12.00K -> 12K. */
function trimTrailingZeros(s: string): string {
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

/** §12.1: max 2 decimals, trailing zeros trimmed, integer values show 0 decimals.
 *  MUST floor-truncate to 2 decimals (not round): rounding makes 999.999 -> 1000,
 *  crossing into the next suffix tier (999,999 would show "1000K" instead of "999.99K"). */
function compactWithPrecision(value: number, divisor: number, suffix: string): string {
  const scaled = value / divisor;
  // 截断到 2 位小数(不四舍五入),避免跨档进位。
  const truncated = Math.floor(scaled * 100) / 100;
  if (Number.isInteger(truncated)) return `${truncated}${suffix}`;
  const fixed = truncated.toFixed(2);
  return `${trimTrailingZeros(fixed)}${suffix}`;
}

export function formatTokens(n: number, locale: string): string {
  const units = CJK_UNITS[locale];
  if (units) {
    for (const u of units) {
      if (n >= u.v) {
        return compactWithPrecision(n, u.v, u.s);
      }
    }
    return String(n);
  }
  if (n < 10_000) return String(n);
  if (n < 1_000_000) return compactWithPrecision(n, 1000, "K");
  if (n < 1_000_000_000) return compactWithPrecision(n, 1_000_000, "M");
  if (n < 1_000_000_000_000) return compactWithPrecision(n, 1_000_000_000, "B");
  return compactWithPrecision(n, 1_000_000_000_000, "T");
}

/** Exact integer with thousands separators, for tooltips/aria-labels. */
export function formatTokensExact(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
```

> 说明:`compactWithPrecision` 用 `Math.floor(scaled * 100) / 100` **截断**到 2 位(不是四舍五入)——四舍五入会让 999,999/1000=999.999 进位成 1000K,跨档破坏 §12.1 规范(审查 P1 确认的真 bug,修复前实测 `999999→1000K`、`99999999→100M`、`999999999→1B`,修复后分别为 `999.99K`/`99.99M`/`999.99M`)。`Number.isInteger(truncated)` 判定整数显示 0 位。CJK 分支复用同一逻辑(1e4 万 刻度下 12,340→1.23万)。原 `trim()` 函数被 `trimTrailingZeros` 取代。

- [ ] **Step 4: 运行确认通过**

```bash
cd gui && bun test tests/format-tokens.test.ts
```

Expected: PASS(全部边界值按 §12.1 表)。

- [ ] **Step 5: 检查既有调用点无破坏**

```bash
cd gui && bun run build
```

Expected: 构建通过(所有 `formatTokens` 调用点仍编译)。

- [ ] **Step 6: 提交**

```bash
git add gui/src/format-tokens.ts gui/tests/format-tokens.test.ts
git commit -m "feat(gui): upgrade formatTokens to max-2-decimal spec with exact-value helper"
```

---

### Task 2: `<CompactNumber>` 组件(精确值 tooltip)

**Files:**
- Create: `gui/src/components/CompactNumber.tsx`
- Test: `gui/tests/compact-number.test.tsx`(新建)

**Interfaces:**
- Consumes: `formatTokens` / `formatTokensExact`(Task 1 产出)
- Produces:
  - `export function CompactNumber({ value, locale, className }: { value: number; locale: string; className?: string }): ReactElement`
  - 渲染:`<span className={className} title={formatTokensExact(value)} aria-label={formatTokensExact(value)}>{formatTokens(value, locale)}</span>`

- [ ] **Step 1: 写失败测试(gui/tests/compact-number.test.tsx)**

参照既有 `gui/tests/*.test.tsx` 的测试模式(用 `react-dom/server` 的 `renderToStaticMarkup` 或既有 render 工具;先看一个既有测试文件确认模式):

```tsx
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompactNumber } from "../src/components/CompactNumber";

describe("CompactNumber", () => {
  test("renders compact value with exact-value title", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={128394822} locale="en" />,
    );
    expect(html).toContain("128.39M");
    expect(html).toContain('title="128,394,822"');
    expect(html).toContain('aria-label="128,394,822"');
  });

  test("integer values render without decimals and exact title", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={100000000} locale="en" />,
    );
    expect(html).toContain("100M");
    expect(html).toContain('title="100,000,000"');
  });

  test("propagates className", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={1000} locale="en" className="mono" />,
    );
    expect(html).toContain('class="mono"');
  });
});
```

> 注:先查看 `gui/tests/dashboard-tabs.test.ts` 等既有测试的 render 方式,若项目用 `@testing-library/react` 则改用其 `render`;本计划用 `renderToStaticMarkup` 作为无依赖的兜底,实现时以既有测试模式为准。

- [ ] **Step 2: 运行确认失败**

```bash
cd gui && bun test tests/compact-number.test.tsx
```

Expected: FAIL — `CompactNumber` 不存在。

- [ ] **Step 3: 实现(CompactNumber.tsx)**

```tsx
import { formatTokens, formatTokensExact } from "../format-tokens";

interface CompactNumberProps {
  value: number;
  locale: string;
  className?: string;
}

/** Compact token display with exact integer in title/aria-label (§12.1). */
export function CompactNumber({ value, locale, className }: CompactNumberProps) {
  const exact = formatTokensExact(value);
  return (
    <span className={className} title={exact} aria-label={exact}>
      {formatTokens(value, locale)}
    </span>
  );
}
```

- [ ] **Step 4: 运行确认通过**

```bash
cd gui && bun test tests/compact-number.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add gui/src/components/CompactNumber.tsx gui/tests/compact-number.test.tsx
git commit -m "feat(gui): add CompactNumber component with exact-value tooltip"
```

---

### Task 3: `formatRequestCount()` 小数位对齐

**Files:**
- Modify: `gui/src/provider-workspace/usage.ts`(`formatRequestCount` 函数,约 193-210 行)
- Test: 无独立新测试文件;在 Task 1 的 `format-tokens.test.ts` 追加(跨文件 import)

**Interfaces:**
- Consumes: 无
- Produces: `formatRequestCount(n, locale)` 与 `formatTokenCount(n, locale)` 输出小数位对齐 §12.1(≤2 位去尾零,整数 0 位),德语分支保留 `Mrd./Mio./Tsd.`

- [ ] **Step 1: 写失败测试(追加到 format-tokens.test.ts)**

```ts
import { formatRequestCount } from "../src/provider-workspace/usage";

describe("formatRequestCount", () => {
  test("en: 1,000 -> 1k (aligned to max-2-decimals)", () => {
    expect(formatRequestCount(1000, "en")).toBe("1k");
  });
  test("en: 12,340 -> 12.34k", () => {
    expect(formatRequestCount(12340, "en")).toBe("12.34k");
  });
  test("en: 128,394,822 -> 128.39M", () => {
    expect(formatRequestCount(128394822, "en")).toBe("128.39M");
  });
  // 跨档边界:截断而非四舍五入
  test("en: 999,999 -> 999.99k (not 1000k)", () => {
    expect(formatRequestCount(999999, "en")).toBe("999.99k");
  });
  test("de: 12,340 -> 12,34 Tsd. (German branch preserved)", () => {
    expect(formatRequestCount(12340, "de")).toBe("12,34 Tsd.");
  });
});
```

> 注:en 分支用小写 `k`(德语分支 `Tsd.`),与 §4.2 逆向出的 `br()` 一致;只改小数位,不改后缀大小写与德语格式。

- [ ] **Step 2: 运行确认失败**

```bash
cd gui && bun test tests/format-tokens.test.ts
```

Expected: FAIL — 当前 `formatRequestCount(12340, "en")` 输出 `12.3k`(1 位)。

- [ ] **Step 3: 实现(usage.ts)**

在 `formatRequestCount` 内用与 Task 1 相同的"最多 2 位去尾零"逻辑替换 `toFixed(1)`:

```ts
export function formatRequestCount(n: number | undefined, locale = "en"): string {
  if (n === undefined) return "\u2014";
  const loc = locale.toLowerCase().slice(0, 2);
  const trimZ = (s: string) => s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  // 截断到 2 位(不四舍五入),避免 999.999 跨档进位成 1000k
  const compact = (value: number, divisor: number, suffix: string): string => {
    const scaled = value / divisor;
    const truncated = Math.floor(scaled * 100) / 100;
    if (Number.isInteger(truncated)) return `${truncated}${suffix}`;
    return `${trimZ(truncated.toFixed(2))}${suffix}`;
  };
  if (loc === "de") {
    const trimDe = (s: string) => s.replace(/\.0+$/, "").replace(".", ",");
    if (n >= 1_000_000_000) return `${trimDe((n / 1_000_000_000).toFixed(2))} Mrd.`;
    if (n >= 1_000_000) return `${trimDe((n / 1_000_000).toFixed(1))} Mio.`;
    if (n >= 1_000) return `${trimDe((n / 1_000).toFixed(1))} Tsd.`;
    return String(n);
  }
  if (n >= 1_000_000_000) return compact(n, 1_000_000_000, "B");
  if (n >= 1_000_000) return compact(n, 1_000_000, "M");
  if (n >= 1_000) return compact(n, 1_000, "k");
  return String(n);
}
```

> 说明:德语分支**保持原样**(`toFixed(2)`/`toFixed(1)` + `Mrd./Mio./Tsd.` 不变,§12.2 只要求"保留");仅 en 分支小数位对齐。

- [ ] **Step 4: 运行确认通过**

```bash
cd gui && bun test tests/format-tokens.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add gui/src/provider-workspace/usage.ts gui/tests/format-tokens.test.ts
git commit -m "feat(gui): align formatRequestCount decimals to max-2 spec"
```

---

### Task 4: 调用点接入 `CompactNumber`(Usage 卡 + Logs 明细)

**Files:**
- Modify: `gui/src/pages/Usage.tsx`(约 284-290 行 KPI 卡、355-360 行 daybar、439 行 heatmap tooltip、519/579 行 breakdown 表)
- Modify: `gui/src/pages/Logs.tsx`(约 747-755 行 token 列、1086-1095 行明细)
- Test: 无新增(现有 `gui/tests` 已覆盖页面渲染;本任务为组件替换)

**Interfaces:**
- Consumes: `CompactNumber`(Task 2 产出)
- Produces: Usage 卡与 Logs 明细的 token 数字带精确值 tooltip

- [ ] **Step 1: Usage.tsx 替换 KPI 卡**

将 `gui/src/pages/Usage.tsx` 中 `formatTokens(summary.totalTokens, locale)` 等 KPI 卡数字替换为 `<CompactNumber value={summary.totalTokens} locale={locale} className="stat-value" />`。逐个处理:

- 284 行:totalTokens 卡
- 287 行:cacheRead 卡
- 290 行:cacheWrite(在文本内,用 `<CompactNumber>` 包裹值)
- 355/360 行:daybar tip
- 439 行:heatmap tooltip 文本(此处是 `t()` 插值,无法用组件;保留 `formatTokens` 文本,但 tooltip 已在 title 层)
- 519/579 行:breakdown 表格列

> 原则:凡是有独立 `<span>`/`<div>` 承载数字的,换 `CompactNumber`;在 `t()` 插值字符串里的(如 heatmap tooltip)保留 `formatTokens`(它们自身已是 tooltip 内容,精确值已由外层提供)。

- [ ] **Step 2: 验证 Usage 构建**

```bash
cd gui && bun run build
```

Expected: 构建通过。

- [ ] **Step 3: Logs.tsx 明细 token 列接入(可选子步)**

将 `gui/src/pages/Logs.tsx` 中明细 token 值(1086-1095 行 `formatTokens(detail.usage.inputTokens, localeCode)` 等)替换为 `<CompactNumber ...>`。表格列(747-755 行)同样处理。

- [ ] **Step 4: 验证 Logs 构建**

```bash
cd gui && bun run build
```

Expected: 构建通过。

- [ ] **Step 5: 提交**

```bash
git add gui/src/pages/Usage.tsx gui/src/pages/Logs.tsx
git commit -m "feat(gui): surface exact token values via CompactNumber in Usage and Logs"
```

---

### Task 5: GUI lint + 全量验证

**Files:** 无(仅命令)

- [ ] **Step 1: GUI lint**

```bash
cd gui && bun run lint
```

Expected: 无错误(如有既有 lint 问题,仅确认本次改动未新增)。

- [ ] **Step 2: GUI 全量测试**

```bash
cd gui && bun test tests
```

Expected: 全部通过(含新增 format-tokens / compact-number 测试)。

- [ ] **Step 3: GUI 构建**

```bash
cd gui && bun run build
```

Expected: 构建通过,产物生成。

- [ ] **Step 4: 后端回归(本 PR 不改后端,确认未受影响)**

```bash
cd .. && bun run typecheck
```

Expected: 通过(后端无改动,类型检查确认)。

- [ ] **Step 5: 提交前检查**

```bash
git status
git log --oneline -5
```

Expected: 工作区干净,4 个提交(Task 1-4)。

---

## Self-Review(写作自查)

- **Spec 覆盖**:§12.1 规范表(全部边界)✅ Task 1;§12.3 精确值可达 ✅ Task 2;§12.2 德语/货币保留 ✅ Task 3/说明;§13.2 格式化层收敛(三函数统一)✅ Task 1+3;§17 格式化检查项 ✅ 全任务。
- **占位符扫描**:无 TBD/TODO;每个 Step 含具体代码与命令。
- **类型一致性**:`formatTokens` / `formatTokensExact` Task 1 产出,`CompactNumber` Task 2 消费;`formatRequestCount` Task 3 独立修改——签名一致。
- **范围**:本 PR 只做格式化层,不动 Usage 页过滤/明细 UI(PR 3)、不动后端(PR 1 已完成)、不动货币格式。
- **风险提示**:`formatTokens` 改造影响所有调用点(Logs 11 处、Usage 7 处、Dashboard 1 处),Task 1 Step 5 的构建验证 + Task 5 全量验证兜底;CJK/德语分支有回归测试。

## 审查修订记录(2026-08-09,计划级审查后)

| # | 严重度 | 发现 | 修订 |
|---|---|---|---|
| 1 | P1 | `compactWithPrecision` 用 `toFixed(2)` 会四舍五入跨档:999,999→1000K、99,999,999→100M、999,999,999→1B,违反 §12.1 规范 | 改为 `Math.floor(scaled*100)/100` 截断到 2 位;Task 1 增加跨档测试 case(99.99M/999.99M);Task 3 的 `formatRequestCount` 同步 |
| 2 | P2 | 计划未明确 `formatTokensExact` 的负数/undefined 处理 | `formatTokensExact(0)→"0"` 已在测试;负数走 `Intl.NumberFormat` 自然输出,无需特殊处理(补充说明) |
| 3 | P3 | Task 2 测试模式需与项目既有模式一致 | 已核实项目用 `renderToStaticMarkup`(models-empty-provider.test.tsx),计划写法正确,无需改 |
| 4 | P1 | 计划测试期望写错两处:(a) `formatTokens(1000)` 我写成 "1K",但 formatTokens 是 1e4 阈值,1000 < 10K 原样显示 "1000"——§12.1 表格的 1K 基于 br() 的 1e3 阈值,与真实主格式化器 formatTokens(1e4)冲突,按 §12.3"阈值保持"裁决为原样;(b) zh 1234567 截断为 123.45万 而非四舍五入的 123.46万 | 测试期望改为 "1000" 与 "123.45万";决策记录:formatTokens 保持 1e4 阈值,§12.1 的 1K 行仅适用于 formatRequestCount(1e3 阈值) |
