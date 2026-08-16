/**
 * Usage 页日期过滤的本地时区转换工具。
 *
 * 背景:此前用 Date.parse("YYYY-MM-DD") 会解析为 UTC 00:00,
 * 后端 timestamp <= to 会排除所选日期当天大部分请求;回读显示用
 * toISOString() 也是按 UTC 截断,存在时区偏移。这里统一按本地时区
 * 取日初/日末,保证「选的哪一天就覆盖哪一天」。
 */

/**
 * 把 "YYYY-MM-DD" 输入解析为本地时区的当日 00:00:00.000(本地日初)。
 * 返回 epoch 毫秒时间戳,可存进 filters.from。
 */
export function dateInputToLocalStart(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/**
 * 把 "YYYY-MM-DD" 输入解析为本地时区的当日 23:59:59.999(本地日末)。
 * 返回 epoch 毫秒时间戳,可存进 filters.to。
 */
export function dateInputToLocalEnd(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/**
 * 把 epoch 毫秒时间戳转回 "YYYY-MM-DD" 字符串,按本地时区取年月日。
 * 不用 toISOString(),因为那会按 UTC 截断,导致时区偏移。
 */
export function tsToDateInput(ts: number): string {
  const date = new Date(ts);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
