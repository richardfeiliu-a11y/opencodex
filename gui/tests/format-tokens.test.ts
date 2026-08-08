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
