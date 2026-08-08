/**
 * Locale-aware token-count formatting, shared by Dashboard/Usage/Logs.
 *
 * Western locales use the K/M/B/T thousands scale; CJK locales (ko/zh) use the myriad
 * (1e4) scale — ko 만/억/조/경, zh 万/亿/兆/京 — which reads naturally there.
 */
const CJK_UNITS: Record<string, Array<{ v: number; s: string }>> = {
  ko: [{ v: 1e16, s: "경" }, { v: 1e12, s: "조" }, { v: 1e8, s: "억" }, { v: 1e4, s: "만" }],
  zh: [{ v: 1e16, s: "京" }, { v: 1e12, s: "兆" }, { v: 1e8, s: "亿" }, { v: 1e4, s: "万" }],
};

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
