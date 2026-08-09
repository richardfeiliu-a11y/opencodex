import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Usage, { UsageFilters } from "../src/pages/Usage"; // 需导出
import { LanguageProvider } from "../src/i18n/provider";
import { clearClientResourceStoresForTests } from "../src/client-resource";

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
        onSurface={() => {}} onRange={() => {}} onFilters={() => {}}
        t={(k: string) => k}
      />,
    );
    expect(html).toContain("provider");
    expect(html).toContain("status");
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
        statusSelect.value = "400";
        statusSelect.dispatchEvent(new testWindow.Event("change", { bubbles: true }));
      });

      // The same filters now also drive the request-history request, so the usage URL
      // is no longer guaranteed to be the last one fetched. Assert it exists and carries
      // the status filter instead of relying on request order.
      const usageUrls = requestedUrls.filter(url => url.includes("/api/usage?"));
      expect(usageUrls.length).toBeGreaterThan(0);
      expect(usageUrls.some(url => url.includes("status=400"))).toBe(true);
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
