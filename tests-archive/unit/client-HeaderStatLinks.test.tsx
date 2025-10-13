/**
 * @jest-environment node
 */
import React from "react";
import * as ReactDOMServer from "react-dom/server";
import StatLink from "../../ui/StatLink";

function renderToHtml(el: React.ReactElement) {
  return ReactDOMServer.renderToStaticMarkup(el);
}

describe("Header Stat Cards — link-only sublines with StatLink", () => {
  test("renders three StatLinks with canonical copy and no inline derived parentheses", () => {
    const html = renderToHtml(
      <div>
        <StatLink onClick={() => {}} dataTestId="area-breakdown-link" />
        <StatLink onClick={() => {}} dataTestId="energy-breakdown-link" />
        <StatLink onClick={() => {}} dataTestId="population-breakdown-link" />
      </div>
    );

    // Presence of stable test ids
    expect(html).toContain('data-testid="area-breakdown-link"');
    expect(html).toContain('data-testid="energy-breakdown-link"');
    expect(html).toContain('data-testid="population-breakdown-link"');

    // Canonical link copy appears for each link
    const expected = "View breakdown ⟶";
    const occurrences = (html.match(new RegExp(expected, "g")) || []).length;
    expect(occurrences).toBe(3);

    // Guard against regressions: no parentheses in the subline region (simple global check)
    expect(html).not.toContain("(");
    expect(html).not.toContain(")");
  });
});
