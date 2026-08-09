import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CompactNumber } from "./CompactNumber";
import { formatProviderDisplayName } from "../provider-icons";
import { EmptyState, Notice } from "../ui";
import type { HistoryEntry } from "../hooks/useRequestHistory";
import type { TFn, Locale } from "../i18n/shared";

/** Estimated height of a single history row for virtualizer sizing. */
const ESTIMATED_ROW_HEIGHT = 44;
/** Overscan so scrolling stays smooth without jank. */
const ROW_OVERSCAN = 15;
/** Trigger loadMore when the user scrolls this close to the bottom (fraction of total table height). */
const LOAD_MORE_THRESHOLD = 0.85;

interface RequestHistoryTableProps {
  rows: HistoryEntry[];
  hasMore: boolean;
  loading: boolean;
  error?: Error;
  loadMore: () => void;
  /** 错误态重试:清空并重拉第一页(reset/retryFirstPage)。 */
  onRetry: () => void;
  t: TFn;
  locale: Locale;
}

/** Status inline color, mirroring the Logs page (`statusColor`) so both tables read alike. */
function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--green)";
  if (status >= 400) return "var(--red)";
  return "var(--amber)";
}

function formatDuration(ms: number, locale: Locale): string {
  try {
    return new Intl.NumberFormat(locale).format(ms);
  } catch {
    return String(ms);
  }
}

function formatDateTime(ts: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString();
  }
}

/**
 * Paginated request-detail table for the Usage page. Consumes the cursor-paginated
 * useRequestHistory result; the parent owns the hook so filters/reset live with the page.
 */
export function RequestHistoryTable({
  rows,
  hasMore,
  loading,
  error,
  loadMore,
  onRetry,
  t,
  locale,
}: RequestHistoryTableProps): JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Pending extra rows reserved for the virtualizer so the scroll position does not
  // jump when a new page lands above the viewport. The loadMore guard is the hook's
  // `loading` state: it fires first-page fetches, auto-scroll fetches, and button
  // clicks through the same inflight path, so we do not duplicate it locally.
  const [pendingExtraHeight, setPendingExtraHeight] = useState(0);

  const totalCount = rows.length + pendingExtraHeight;

  // TanStack Virtual returns unstable function identities; React Compiler skips this call.
  // eslint-disable-next-line react-hooks/incompatible-library -- known useVirtualizer limitation
  const rowVirtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  const executeLoadMore = useCallback(async () => {
    if (loading) return;
    if (!hasMore) {
      setPendingExtraHeight(0);
      return;
    }
    // Reserve a small height chunk so the virtualizer reserves scroll space for the incoming
    // page; keeps the viewport from jumping when the new rows are appended above.
    setPendingExtraHeight(20);
    try {
      await loadMore();
    } finally {
      setPendingExtraHeight(0);
    }
  }, [loadMore, hasMore, loading]);

  // Auto-load more when the user scrolls close to the bottom. Uses the stable
  // executeLoadMore so it doesn't close over stale state.
  const executeLoadMoreRef = useRef(executeLoadMore);
  useEffect(() => { executeLoadMoreRef.current = executeLoadMore; });

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight <= 0) return;
    const nearBottom = (scrollTop + clientHeight) / scrollHeight >= LOAD_MORE_THRESHOLD;
    if (nearBottom) executeLoadMoreRef.current();
  }, []);

  if (error && rows.length === 0) {
    return (
      <Notice tone="err">
        {t("usage.requests.loadError")}{" "}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </Notice>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState title={t("logs.noRequests")} />
    );
  }

  return (
    <div className="tbl-wrap">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ overflow: "auto", maxHeight: 520 }}
      >
        <table className="tbl logs-table">
          <thead>
            <tr>
              <th>{t("logs.col.time")}</th>
              <th>{t("logs.col.provider")}</th>
              <th>{t("usage.requests.col.model")}</th>
              <th>{t("logs.col.status")}</th>
              <th className="num">{t("logs.col.tokens")}</th>
              <th className="num">{t("logs.col.duration")}</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 ? (
              <tr>
                <td colSpan={6} className="logs-virtual-spacer" style={{ height: paddingTop }} />
              </tr>
            ) : null}

            {virtualRows.map(virtualRow => {
              const idx = virtualRow.index;
              // Out-of-band indices are reserved extra-height rows (pendingExtraHeight).
              const row = rows[idx];
              if (row === undefined) return null;

              const resolved = row.model;
              const requested = row.requestedModel;
              return (
                <tr
                  key={row.requestId}
                  data-index={idx}
                  ref={rowVirtualizer.measureElement}
                >
                  <td className="muted mono">
                    {formatDateTime(row.timestamp, locale)}
                  </td>
                  <td className="muted">
                    {formatProviderDisplayName(row.provider, t)}
                  </td>
                  <td>
                    {requested !== undefined && requested !== resolved ? (
                      <span className="logs-stack-start">
                        <span>{requested}</span>
                        <span className="muted text-caption leading-tight">→ {resolved}</span>
                      </span>
                    ) : (
                      <span className="mono">{resolved}</span>
                    )}
                  </td>
                  <td>
                    <span className="mono font-semibold" style={{ color: statusColor(row.status) }}>
                      {row.status}
                    </span>
                  </td>
                  <td className="num">
                    {row.totalTokens !== undefined ? (
                      <CompactNumber value={row.totalTokens} locale={locale} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">{formatDuration(row.durationMs, locale)} ms</td>
                </tr>
              );
            })}

            {paddingBottom > 0 ? (
              <tr>
                <td colSpan={6} className="logs-virtual-spacer" style={{ height: paddingBottom }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="usage-requests-more" style={{ textAlign: "center", padding: "8px 0" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={executeLoadMore}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? `${t("common.loading")} ${rows.length}…` : t("logs.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
