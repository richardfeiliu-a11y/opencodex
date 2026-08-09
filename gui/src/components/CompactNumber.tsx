import type { JSX } from "react";
import { formatTokens, formatTokensExact } from "../format-tokens";

interface CompactNumberProps {
  value: number;
  locale: string;
  className?: string;
}

/** Compact token display with exact integer in title/aria-label (§12.1). */
export function CompactNumber({
  value,
  locale,
  className,
}: CompactNumberProps): JSX.Element {
  const exact = formatTokensExact(value);
  return (
    <span className={className} title={exact} aria-label={exact}>
      {formatTokens(value, locale)}
    </span>
  );
}
