import type { JSX } from "react";
import { CompactNumber } from "./CompactNumber";
import { formatProviderDisplayName } from "../provider-icons";
import { EmptyState, Notice } from "../ui";
import type { HistoryEntry } from "../hooks/useRequestHistory";
import type { TFn, Locale } from "../i18n/shared";

interface RequestHistoryTableProps {
  rows: HistoryEntry[];
  hasMore: boolean;
  loading: boolean;
  error?: Error;
  loadMore: () => void;
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
  t,
  locale,
}: RequestHistoryTableProps): JSX.Element {
  if (error && rows.length === 0) {
    return (
      <Notice tone="err">
        {t("usage.requests.loadError")}{" "}
        <button type="button" className="btn btn-ghost btn-sm" onClick={loadMore}>
          {t("common.retry")}
        </button>
      </Notice>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        {error && rows.length > 0 && <Notice tone="err">{t("usage.requests.loadError")}</Notice>}
        <EmptyState title={t("logs.noRequests")} />
      </>
    );
  }

  return (
    <div className="tbl-wrap logs-table-wrap">
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
          {rows.map(row => {
            const resolved = row.model;
            const requested = row.requestedModel;
            return (
              <tr key={row.requestId}>
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
        </tbody>
      </table>
      {hasMore && (
        <div className="usage-requests-more">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("logs.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
