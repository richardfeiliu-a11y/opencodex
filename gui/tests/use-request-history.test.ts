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
