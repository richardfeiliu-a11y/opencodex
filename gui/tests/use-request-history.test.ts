import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement } from "react";
import type { Root } from "react-dom/client";
import {
  buildHistoryUrl,
  useRequestHistory,
  type UsageFilters,
} from "../src/hooks/useRequestHistory";

// 纯逻辑测试:过滤/range/surface → URL 序列化。
describe("useRequestHistory serialization", () => {
  test("serializes filters into query params", () => {
    const url = buildHistoryUrl("/api", { provider: "openai", model: "gpt-5.5", status: "2xx", from: 1000, to: 2000 }, "all", "all");
    expect(url).toContain("provider=openai");
    expect(url).toContain("model=gpt-5.5");
    expect(url).toContain("status=2xx");
    expect(url).toContain("from=1000");
    expect(url).toContain("to=2000");
  });

  test("empty filters omit params", () => {
    const url = buildHistoryUrl("/api", {}, "all", "all");
    expect(url).not.toContain("provider=");
    expect(url).not.toContain("status=");
    expect(url).not.toContain("from=");
    expect(url).not.toContain("surface=");
  });

  test("cursor appends only when present", () => {
    expect(buildHistoryUrl("/api", {}, "all", "all", "abc123")).toContain("cursor=abc123");
    expect(buildHistoryUrl("/api", {}, "all", "all")).not.toContain("cursor=");
  });

  test("range all omits from", () => {
    const url = buildHistoryUrl("/api", {}, "all", "all");
    expect(url).not.toContain("from=");
  });

  test("range 7d maps to now - 7 days", () => {
    const before = Date.now() - 7 * 86_400_000;
    const url = buildHistoryUrl("/api", {}, "7d", "all");
    expect(url).toContain("from=");
    const from = Number(new URL(url, "http://x").searchParams.get("from"));
    expect(Math.abs(from - before)).toBeLessThan(5_000);
  });

  test("range 30d maps to now - 30 days", () => {
    const before = Date.now() - 30 * 86_400_000;
    const url = buildHistoryUrl("/api", {}, "30d", "all");
    const from = Number(new URL(url, "http://x").searchParams.get("from"));
    expect(Math.abs(from - before)).toBeLessThan(5_000);
  });

  test("explicit filters.from wins over range", () => {
    const url = buildHistoryUrl("/api", { from: 1000, to: 2000 }, "30d", "all");
    const params = new URL(url, "http://x").searchParams;
    expect(params.get("from")).toBe("1000");
    expect(params.get("to")).toBe("2000");
  });

  test("surface all omits param", () => {
    expect(buildHistoryUrl("/api", {}, "all", "all")).not.toContain("surface=");
  });

  test("surface codex/claude/grok serialize to matching params", () => {
    expect(buildHistoryUrl("/api", {}, "all", "codex")).toContain("surface=codex");
    expect(buildHistoryUrl("/api", {}, "all", "claude")).toContain("surface=claude");
    expect(buildHistoryUrl("/api", {}, "all", "grok")).toContain("surface=grok");
  });
});

// hook 行为测试:happy-dom + 真实 fetch 存根。
describe("useRequestHistory behavior", () => {
  const globals = ["document", "window", "navigator", "localStorage", "IS_REACT_ACT_ENVIRONMENT"] as const;
  let previous: Record<(typeof globals)[number], unknown>;
  let win: Window;
  let host: HTMLElement;
  let root: Root | null = null;
  const originalFetch = globalThis.fetch;
  let calls: string[] = [];

  beforeEach(() => {
    previous = Object.fromEntries(globals.map(key => [key, Reflect.get(globalThis, key)])) as typeof previous;
    win = new Window({ url: "http://localhost/" });
    Object.defineProperties(globalThis, {
      document: { configurable: true, value: win.document },
      window: { configurable: true, value: win },
      navigator: { configurable: true, value: win.navigator },
      localStorage: { configurable: true, value: win.localStorage },
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    calls = [];
    host = document.createElement("div");
    document.body.appendChild(host);
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      calls.push(`${url.pathname}${url.search}`);
      const delay = Number(new URL(url, "http://x").searchParams.get("delay") ?? 0);
      await new Promise(resolve => setTimeout(resolve, delay));
      return Response.json({ entries: [], nextCursor: null });
    }) as typeof fetch;
  });

  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    host.remove();
    win.happyDOM.cancelAsync();
    globalThis.fetch = originalFetch;
    for (const key of globals) {
      const value = previous[key];
      if (value === undefined) Reflect.deleteProperty(globalThis, key);
      else Reflect.set(globalThis, key, value);
    }
  });

  async function renderHook() {
    let result!: ReturnType<typeof useRequestHistory>;
    function Harness({ filters, range, surface }: { filters: UsageFilters; range: "all" | "30d" | "7d"; surface: "all" | "codex" | "claude" | "grok" }) {
      result = useRequestHistory("http://api", filters, range, surface);
      return null;
    }
    const { createRoot } = await import("react-dom/client");
    await act(async () => {
      root = createRoot(host);
      root.render(createElement(Harness, { filters: {}, range: "all", surface: "all" }));
    });
    return {
      get result() { return result; },
      rerender(next: { filters?: UsageFilters; range?: "all" | "30d" | "7d"; surface?: "all" | "codex" | "claude" | "grok" }) {
        return act(async () => {
          root?.render(createElement(Harness, {
            filters: next.filters ?? {},
            range: next.range ?? "all",
            surface: next.surface ?? "all",
          }));
        });
      },
    };
  }

  test("resets stale rows when filters change", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      calls.push(`${url.pathname}${url.search}`);
      if (calls.length === 1) {
        // 第一个请求慢,期间过滤已切换
        await new Promise(resolve => setTimeout(resolve, 30));
        return Response.json({ entries: [{ requestId: "old", timestamp: 1, provider: "a", model: "m", status: 200, durationMs: 1 }], nextCursor: null });
      }
      return Response.json({ entries: [], nextCursor: null });
    }) as typeof fetch;

    const hook = await renderHook();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    // 慢请求在途时切换过滤 → rows 立即清空
    await hook.rerender({ filters: { provider: "b" }, range: "30d", surface: "all" });
    expect(hook.result.rows).toEqual([]);
    expect(hook.result.hasMore).toBe(false);
    expect(hook.result.error).toBeUndefined();
    // 等旧响应到达并完成新请求后,旧 rows 仍不残留
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
    expect(hook.result.rows).toEqual([]);
  });

  test("retryFirstPage clears state and fetches the first page", async () => {
    let fetchCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchCount += 1;
      const url = new URL(String(input), "http://localhost");
      if (url.search.includes("cursor=")) throw new Error("retry must not paginate");
      // 第一页成功返回一条 + cursor;loadMore 带 cursor 时抛错;retryFirstPage 再拉第一页成功
      return Response.json({ entries: [{ requestId: "r1", timestamp: 1, provider: "a", model: "m", status: 200, durationMs: 1 }], nextCursor: "c1" });
    }) as typeof fetch;

    const hook = await renderHook();
    // loadMore 拉第二页失败 → 错误态(rows 非空)
    hook.result.loadMore();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(hook.result.error).toBeInstanceOf(Error);

    // retryFirstPage 等价 reset:清状态 + 拉第一页(无 cursor)
    hook.result.retryFirstPage();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(fetchCount).toBe(3);
    expect(hook.result.error).toBeUndefined();
    expect(hook.result.rows).toEqual([{ requestId: "r1", timestamp: 1, provider: "a", model: "m", status: 200, durationMs: 1 }]);
  });

  test("reset is an alias of retryFirstPage", async () => {
    let fetchCount = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetchCount += 1;
      const url = new URL(String(input), "http://localhost");
      if (url.pathname.includes("cursor=")) throw new Error("reset must not paginate");
      return Response.json({ entries: [], nextCursor: null });
    }) as typeof fetch;
    const hook = await renderHook();
    hook.result.reset();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(fetchCount).toBe(2);
  });

  test("retryFirstPage passes range and surface into the URL", async () => {
    let lastUrl = "";
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      lastUrl = String(input);
      return Response.json({ entries: [], nextCursor: null });
    }) as typeof fetch;
    const hook = await renderHook();
    await hook.rerender({ filters: {}, range: "7d", surface: "grok" });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(lastUrl).toContain("surface=grok");
    expect(lastUrl).toContain("from=");
  });
});
