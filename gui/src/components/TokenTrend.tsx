import { useId, type JSX } from "react";
import type { Locale, TFn } from "../i18n/shared";

/** Minimal data shape the trend chart needs — subset of the Usage API's `UsageDay`. */
export interface TokenTrendDay {
  date: string;
  totalTokens: number;
}

interface TokenTrendProps {
  days: TokenTrendDay[];
  locale: Locale;
  t: TFn;
}

// Fixed plot area inside the SVG viewBox. Padding leaves room for the point circles
// (radius 3) so they never clip at the edges.
const VIEW_W = 800;
const VIEW_H = 180;
const PAD_X = 8;
const PAD_Y = 10;
const PLOT_W = VIEW_W - PAD_X * 2;
const PLOT_H = VIEW_H - PAD_Y * 2;
const POINT_R = 3;

/**
 * Day-by-day total-token line chart, hand-rolled SVG (the project has no chart library).
 *
 * Consumes the Usage API's filtered `days[]` (same source as the Summary cards), so the
 * line always agrees with the totals above it. Only the total series is drawn — input /
 * output / cache split is deferred. Dates are the x axis (evenly spaced), tokens the y axis
 * (scaled to the visible data). Hovering a point shows the exact token count via `<title>`.
 */
export function TokenTrend({ days, locale, t }: TokenTrendProps): JSX.Element {
  const titleId = useId();
  const exactFormatter = new Intl.NumberFormat(locale);

  // Empty state: keep the section visible (so the panel doesn't jump) but draw nothing.
  if (days.length === 0) {
    return (
      <section className="panel" style={{ marginTop: 16 }} aria-labelledby={titleId}>
        <h3 id={titleId} className="panel-title">{t("usage.trend.title")}</h3>
        <svg
          className="token-trend"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={t("usage.trend.title")}
        />
      </section>
    );
  }

  const maxTokens = Math.max(...days.map(d => d.totalTokens), 0);
  // A flat line (all days 0 or all days equal) still renders on the middle row instead of
  // collapsing to the bottom edge.
  const yMax = maxTokens > 0 ? maxTokens : 1;
  const x = (i: number) => PAD_X + (days.length === 1 ? PLOT_W / 2 : (i / (days.length - 1)) * PLOT_W);
  const y = (v: number) => PAD_Y + PLOT_H - (v / yMax) * PLOT_H;
  const points = days.map((d, i) => `${x(i).toFixed(1)},${y(d.totalTokens).toFixed(1)}`).join(" ");

  return (
    <section className="panel" style={{ marginTop: 16 }} aria-labelledby={titleId}>
      <h3 id={titleId} className="panel-title">{t("usage.trend.title")}</h3>
      <svg
        className="token-trend"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={t("usage.trend.title")}
      >
        {days.length >= 2 && (
          <polyline
            className="token-trend-line"
            points={points}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {days.map((d, i) => (
          <circle
            key={d.date}
            className="token-trend-point"
            cx={x(i)}
            cy={y(d.totalTokens)}
            r={POINT_R}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${d.date}: ${exactFormatter.format(d.totalTokens)}`}</title>
          </circle>
        ))}
      </svg>
    </section>
  );
}
