import { describe, expect, test } from "bun:test";
import { formatTokens } from "../src/format-tokens";

describe("formatTokens", () => {
  test("western locales use K/M/B/T with one decimal", () => {
    expect(formatTokens(500, "en")).toBe("500");
    expect(formatTokens(12_000, "en")).toBe("12K");
    expect(formatTokens(1_234_000, "en")).toBe("1.2M");
    expect(formatTokens(1_234_000_000, "en")).toBe("1.2B");
  });

  test("CJK locales use myriad units", () => {
    expect(formatTokens(12_000, "zh")).toBe("1.2万");
    expect(formatTokens(12_000, "ko")).toBe("1.2만");
  });

  test("German branch uses Tsd./Mio./Mrd. with comma decimals and floor truncation", () => {
    expect(formatTokens(500, "de")).toBe("500");
    expect(formatTokens(12_000, "de")).toBe("12Tsd.");
    expect(formatTokens(999_999, "de")).toBe("999,99Tsd.");
    expect(formatTokens(1_234_000, "de")).toBe("1,23Mio.");
    expect(formatTokens(1_234_000_000, "de")).toBe("1,23Mrd.");
  });

  test("locale matching is case- and script-insensitive", () => {
    expect(formatTokens(12_000, "de-DE")).toBe("12Tsd.");
    expect(formatTokens(12_000, "de-CH")).toBe("12Tsd.");
    expect(formatTokens(12_000, "ZH-CN")).toBe("1.2万");
  });
});
