import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CompactNumber } from "../src/components/CompactNumber";

describe("CompactNumber", () => {
  test("renders compact value with exact-value title", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={128394822} locale="en" />,
    );
    expect(html).toContain("128.39M");
    expect(html).toContain('title="128,394,822"');
    expect(html).toContain('aria-label="128,394,822"');
  });

  test("integer values render without decimals and exact title", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={100000000} locale="en" />,
    );
    expect(html).toContain("100M");
    expect(html).toContain('title="100,000,000"');
  });

  test("propagates className", () => {
    const html = renderToStaticMarkup(
      <CompactNumber value={1000} locale="en" className="mono" />,
    );
    expect(html).toContain('class="mono"');
  });
});
