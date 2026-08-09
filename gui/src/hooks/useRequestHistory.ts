import { useCallback, useEffect, useRef, useState } from "react";

export interface UsageFilters {
  provider?: string;
  model?: string;
  status?: number;
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

export function buildHistoryUrl(apiBase: string, filters: UsageFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.model) params.set("model", filters.model);
  if (filters.status !== undefined) params.set("status", String(filters.status));
  if (filters.from !== undefined) params.set("from", String(filters.from));
  if (filters.to !== undefined) params.set("to", String(filters.to));
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
  reset: () => void;
}

/** Cursor-paginated request history. Filters change => cursor resets (§9.3). */
export function useRequestHistory(
  apiBase: string,
  filters: UsageFilters,
): UseRequestHistoryResult {
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const activeCursor = useRef<string | undefined>(undefined);
  const seqRef = useRef(0);
  const filtersKey = JSON.stringify(filters);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPage = useCallback(async (c: string | undefined) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(buildHistoryUrl(apiBase, filtersRef.current, c));
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
  }, [apiBase, filtersKey]);

  // 过滤条件变化 => 重置游标与列表
  useEffect(() => {
    seqRef.current++; // 作废在途旧请求
    activeCursor.current = undefined;
    setRows([]);
    void fetchPage(undefined);
  }, [filtersKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !activeCursor.current) return;
    void fetchPage(activeCursor.current);
  }, [loading, fetchPage]);

  const reset = useCallback(() => {
    seqRef.current++; // 作废在途旧请求
    activeCursor.current = undefined;
    setRows([]);
    void fetchPage(undefined);
  }, [fetchPage]);

  return { rows, hasMore, loading, error, loadMore, reset };
}
