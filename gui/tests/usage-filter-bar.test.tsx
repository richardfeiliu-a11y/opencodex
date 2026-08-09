import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Usage, { UsageFilters } from "../src/pages/Usage"; // 需导出
import { LanguageProvider } from "../src/i18n/provider";
import { clearClientResourceStoresForTests } from "../src/client-resource";
import {
  dateInputToLocalEnd,
  dateInputToLocalStart,
  tsToDateInput,
} from "../src/usage-date-utils";

function usageResponse() {
  return Response.json({
    range: "30d",
    surface: "all",
    since: null,
    generatedAt: Date.now(),
    summary: {
      requests: 0,
      measuredRequests: 0,
      reportedRequests: 0,
      unreportedRequests: 0,
      unsupportedRequests: 0,
      estimatedRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
      coverageRatio: 1,
    },
    days: [],
    models: [],
    providers: [],
    historyTruncated: false,
    truncatedPrefixBytes: 0,
    entriesTruncated: false,
    entriesDropped: 0,
  });
}

describe("UsageFilters", () => {
  test("renders provider/model/status/date controls", () => {
    const html = renderToStaticMarkup(
      <UsageFilters
        surface="all" range="30d" filters={{}}
        providers={["my-gateway", "openai"]}
        onSurface={() => {}} onRange={() => {}} onFilters={() => {}}
        t={(k: string) => k}
      />,
    );
    expect(html).toContain("provider");
    expect(html).toContain("status");
  });

  test("provider filter is a free-text input with deduped datalist suggestions", () => {
    const html = renderToStaticMarkup(
      <UsageFilters
        surface="all" range="30d" filters={{}}
        providers={["my-gateway", "openai"]}
        onSurface={() => {}} onRange={() => {}} onFilters={() => {}}
        t={(k: string) => k}
      />,
    );
    expect(html).toContain('list="usage-providers"');
    expect(html).toContain('<datalist id="usage-providers">');
    expect(html).toContain('value="my-gateway"');
    // openai 同时出现在静态列表与 data.providers 中,去重后只应渲染一次
    expect(html.split('value="openai"').length - 1).toBe(1);
  });

  test("date helpers convert to local day start/end and round-trip", () => {
    const input = "2026-08-09";
    const start = dateInputToLocalStart(input);
    const end = dateInputToLocalEnd(input);
    expect(start).toBe(new Date(2026, 7, 9, 0, 0, 0, 0).getTime());
    expect(end).toBe(new Date(2026, 7, 9, 23, 59, 59, 999).getTime());
    // 本地日末 - 本地日初 = 24h - 1ms;2026-08-09 全球无 DST 切换,差值恒为 86399999
    expect(end - start).toBe(86_399_999);
    for (const value of ["2026-08-09", "2024-02-29", "2026-12-31"]) {
      expect(tsToDateInput(dateInputToLocalStart(value))).toBe(value);
      expect(tsToDateInput(dateInputToLocalEnd(value))).toBe(value);
    }
  });

  test("custom provider typed into the filter serializes to the URL", async () => {
    const globalKeys = ["document", "window", "navigator", "localStorage", "IS_REACT_ACT_ENVIRONMENT"] as const;
    const previous = Object.fromEntries(globalKeys.map(key => [key, Reflect.get(globalThis, key)]));
    const originalFetch = globalThis.fetch;
    const testWindow = new Window({ url: "http://localhost/" });
    Object.defineProperties(globalThis, {
      document: { configurable: true, value: testWindow.document },
      window: { configurable: true, value: testWindow },
      navigator: { configurable: true, value: testWindow.navigator },
      localStorage: { configurable: true, value: testWindow.localStorage },
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearClientResourceStoresForTests();

    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return usageResponse();
    }) as typeof fetch;

    const container = document.createElement("div");
    document.body.append(container);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(createElement(LanguageProvider, null, createElement(Usage, { apiBase: "http://filter-test" })));
      });
      const deadline = Date.now() + 1_000;
      while (requestedUrls.length === 0) {
        if (Date.now() >= deadline) throw new Error("Usage did not fetch");
        await act(async () => {
          await new Promise<void>(resolve => testWindow.setTimeout(resolve, 10));
        });
      }

      const providerInput = container.querySelector('input[list="usage-providers"]') as HTMLInputElement;
      expect(providerInput).not.toBeNull();
      // React 受控输入用 value tracker 拦截直接赋值,须用原生 setter + input 事件触发 onChange
      const valueSetter = Object.getOwnPropertyDescriptor(testWindow.HTMLInputElement.prototype, "value")!.set!;
      await act(async () => {
        valueSetter.call(providerInput, "my-provider");
        providerInput.dispatchEvent(new testWindow.Event("input", { bubbles: true }));
      });

      const usageUrls = requestedUrls.filter(url => url.includes("/api/usage?"));
      expect(usageUrls.length).toBeGreaterThan(0);
      expect(usageUrls.some(url => url.includes("provider=my-provider"))).toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      globalThis.fetch = originalFetch;
      clearClientResourceStoresForTests();
      testWindow.close();
      for (const key of globalKeys) {
        const value = previous[key];
        if (value === undefined) {
          Reflect.deleteProperty(globalThis, key);
        } else {
          Reflect.set(globalThis, key, value);
        }
      }
    }
  });

  test("date inputs serialize local day start/end and round-trip in the input value", async () => {
    const globalKeys = ["document", "window", "navigator", "localStorage", "IS_REACT_ACT_ENVIRONMENT"] as const;
    const previous = Object.fromEntries(globalKeys.map(key => [key, Reflect.get(globalThis, key)]));
    const originalFetch = globalThis.fetch;
    const testWindow = new Window({ url: "http://localhost/" });
    Object.defineProperties(globalThis, {
      document: { configurable: true, value: testWindow.document },
      window: { configurable: true, value: testWindow },
      navigator: { configurable: true, value: testWindow.navigator },
      localStorage: { configurable: true, value: testWindow.localStorage },
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearClientResourceStoresForTests();

    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return usageResponse();
    }) as typeof fetch;

    const container = document.createElement("div");
    document.body.append(container);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(createElement(LanguageProvider, null, createElement(Usage, { apiBase: "http://filter-test" })));
      });
      const deadline = Date.now() + 1_000;
      while (requestedUrls.length === 0) {
        if (Date.now() >= deadline) throw new Error("Usage did not fetch");
        await act(async () => {
          await new Promise<void>(resolve => testWindow.setTimeout(resolve, 10));
        });
      }

      const valueSetter = Object.getOwnPropertyDescriptor(testWindow.HTMLInputElement.prototype, "value")!.set!;
      const dateInputs = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
      const [fromInput, toInput] = dateInputs;
      expect(fromInput).toBeDefined();
      expect(toInput).toBeDefined();

      await act(async () => {
        valueSetter.call(fromInput, "2026-08-09");
        fromInput.dispatchEvent(new testWindow.Event("input", { bubbles: true }));
      });
      await act(async () => {
        valueSetter.call(toInput, "2026-08-09");
        toInput.dispatchEvent(new testWindow.Event("input", { bubbles: true }));
      });
      await act(async () => {
        await new Promise<void>(resolve => testWindow.setTimeout(resolve, 50));
      });

      const usageUrls = requestedUrls.filter(url => url.includes("/api/usage?"));
      const lastUsageUrl = usageUrls[usageUrls.length - 1];
      const params = new URLSearchParams(lastUsageUrl.split("?")[1]);
      expect(Number(params.get("from"))).toBe(dateInputToLocalStart("2026-08-09"));
      expect(Number(params.get("to"))).toBe(dateInputToLocalEnd("2026-08-09"));
      // 回读显示与输入一致(本地日期往返,不因 UTC 偏移变前一天)
      expect(fromInput.value).toBe("2026-08-09");
      expect(toInput.value).toBe("2026-08-09");
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      globalThis.fetch = originalFetch;
      clearClientResourceStoresForTests();
      testWindow.close();
      for (const key of globalKeys) {
        const value = previous[key];
        if (value === undefined) {
          Reflect.deleteProperty(globalThis, key);
        } else {
          Reflect.set(globalThis, key, value);
        }
      }
    }
  });

  test("status filter changes the /api/usage request URL", async () => {
    const globalKeys = ["document", "window", "navigator", "localStorage", "IS_REACT_ACT_ENVIRONMENT"] as const;
    const previous = Object.fromEntries(globalKeys.map(key => [key, Reflect.get(globalThis, key)]));
    const originalFetch = globalThis.fetch;
    const testWindow = new Window({ url: "http://localhost/" });
    Object.defineProperties(globalThis, {
      document: { configurable: true, value: testWindow.document },
      window: { configurable: true, value: testWindow },
      navigator: { configurable: true, value: testWindow.navigator },
      localStorage: { configurable: true, value: testWindow.localStorage },
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearClientResourceStoresForTests();

    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrls.push(String(input));
      return usageResponse();
    }) as typeof fetch;

    const container = document.createElement("div");
    document.body.append(container);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(createElement(LanguageProvider, null, createElement(Usage, { apiBase: "http://filter-test" })));
      });
      const deadline = Date.now() + 1_000;
      while (requestedUrls.length === 0) {
        if (Date.now() >= deadline) throw new Error("Usage did not fetch");
        await act(async () => {
          await new Promise<void>(resolve => testWindow.setTimeout(resolve, 10));
        });
      }

      const statusSelect = Array.from(container.querySelectorAll("select"))
        .find(sel => (sel as HTMLSelectElement).options[0]?.textContent === "All statuses") as HTMLSelectElement;
      expect(statusSelect).not.toBeNull();
      await act(async () => {
        statusSelect.value = "4xx";
        statusSelect.dispatchEvent(new testWindow.Event("change", { bubbles: true }));
      });

      // The same filters now also drive the request-history request, so the usage URL
      // is no longer guaranteed to be the last one fetched. Assert it exists and carries
      // the status filter instead of relying on request order.
      const usageUrls = requestedUrls.filter(url => url.includes("/api/usage?"));
      expect(usageUrls.length).toBeGreaterThan(0);
      expect(usageUrls.some(url => url.includes("status=4xx"))).toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      globalThis.fetch = originalFetch;
      clearClientResourceStoresForTests();
      testWindow.close();
      for (const key of globalKeys) {
        const value = previous[key];
        if (value === undefined) {
          Reflect.deleteProperty(globalThis, key);
        } else {
          Reflect.set(globalThis, key, value);
        }
      }
    }
  });
});
