import { useCallback, useEffect, useRef, useState } from "react";

/** 时间范围选择(与 Usage 页 Summary 一致);all 表示不设时间下限。 */
export type Range = "all" | "30d" | "7d";

/** 入口渠道选择(与 Usage 页 Summary 一致);all 表示不按渠道过滤。 */
export type UsageSurface = "all" | "codex" | "claude" | "grok";

export interface UsageFilters {
  provider?: string;
  model?: string;
  status?: "2xx" | "4xx" | "5xx";
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

export function buildHistoryUrl(
  apiBase: string,
  filters: UsageFilters,
  range: Range,
  surface: UsageSurface,
  cursor?: string,
): string {
  const params = new URLSearchParams();
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.model) params.set("model", filters.model);
  if (filters.status !== undefined) params.set("status", String(filters.status));
  // from/to 显式过滤优先于 range;range 只在未设 from 时生效(与 /api/usage 语义一致)。
  if (filters.from === undefined) {
    const DAY_MS = 86_400_000;
    if (range === "30d") params.set("from", String(Date.now() - 30 * DAY_MS));
    else if (range === "7d") params.set("from", String(Date.now() - 7 * DAY_MS));
  }
  if (filters.from !== undefined) params.set("from", String(filters.from));
  if (filters.to !== undefined) params.set("to", String(filters.to));
  // surface 序列化:all 不传;其余按后端语义化匹配规则传参。
  if (surface !== "all") params.set("surface", surface);
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
  /** 重置列表并重新拉取第一页(等价 reset);错误态重试用。 */
  retryFirstPage: () => void;
  reset: () => void;
}

/**
 * Cursor-paginated request history. Filters/range/surface change =>
 * rows/hasMore/error reset and first page reloads (§9.3).
 */
export function useRequestHistory(
  apiBase: string,
  filters: UsageFilters,
  range: Range,
  surface: UsageSurface,
): UseRequestHistoryResult {
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const activeCursor = useRef<string | undefined>(undefined);
  const seqRef = useRef(0);
  const filtersKey = JSON.stringify(filters);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  const rangeRef = useRef(range);
  useEffect(() => {
    rangeRef.current = range;
  }, [range]);
  const surfaceRef = useRef(surface);
  useEffect(() => {
    surfaceRef.current = surface;
  }, [surface]);

  const fetchPage = useCallback(async (c: string | undefined) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(buildHistoryUrl(
        apiBase,
        filtersRef.current,
        rangeRef.current,
        surfaceRef.current,
        c,
      ));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (seq !== seqRef.current) return; // 旧响应丢弃
      const nextRows: HistoryEntry[] = body.entries ?? [];
      if (c === undefined) setRows(nextRows);
      else setRows(prev => [...prev, ...nextRows]);
      setHasMore(!!body.nextCursor);
      activeCursor.current = body.nextCursor;
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [apiBase]);

  // 过滤/range/surface 变化 => 清空旧数据、重置游标并拉第一页
  useEffect(() => {
    seqRef.current++; // 作废在途旧请求
    activeCursor.current = undefined;
    // 微任务延迟：setState 移出 effect 同步体，避免级联渲染；且不像定时器可被 cleanup 取消，
    // 保证 StrictMode 下请求必然发出（seq 校验保证只有最后一次生效）。
    void Promise.resolve().then(() => {
      setRows([]);
      setHasMore(false);
      setError(undefined);
      void fetchPage(undefined);
    });
  }, [filtersKey, range, surface, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !activeCursor.current) return;
    void fetchPage(activeCursor.current);
  }, [loading, fetchPage]);

  const resetAndFetchFirstPage = useCallback(() => {
    seqRef.current++; // 作废在途旧请求
    activeCursor.current = undefined;
    setRows([]);
    setHasMore(false);
    setError(undefined);
    void fetchPage(undefined);
  }, [fetchPage]);

  return {
    rows,
    hasMore,
    loading,
    error,
    loadMore,
    retryFirstPage: resetAndFetchFirstPage,
    reset: resetAndFetchFirstPage,
  };
}
