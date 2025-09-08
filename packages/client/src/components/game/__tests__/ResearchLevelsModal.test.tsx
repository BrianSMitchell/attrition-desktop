/**
 * @jest-environment node
 */
import React from "react";
import * as ReactDOMServer from "react-dom/server";
import ResearchLevelsModal from "../../game/ResearchLevelsModal";
import { METRIC_LABELS } from "../../game/levelTables/research/metrics";

// Helper to render component to static markup (no need for jsdom or RTL)
function renderToHtml(el: React.ReactElement) {
  return ReactDOMServer.renderToStaticMarkup(el);
}

describe("ResearchLevelsModal — metrics and credits-only rendering", () => {
  test("uses exact header label for Ion metric (Ion Weapons Attack)", () => {
    // Sanity: ensure the METRIC_LABELS map has the expected value
    expect(METRIC_LABELS.ionWeaponsAttackPct || METRIC_LABELS["ionWeaponsAttackPct"]).toBe(
      "Ion Weapons Attack"
    );

    const html = renderToHtml(<ResearchLevelsModal techKey={"ion" as any} />);

    // Header should include the Ion metric label exactly
    expect(html).toContain("Ion Weapons Attack");

    // Should not include Labs/Requires/Effect block when a single metric column is visible
    expect(html).not.toContain(">Labs<");
    expect(html).not.toContain(">Requires<");
    expect(html).not.toContain(">Effect<");
  });

  test("uses exact header label for Disruptor metric (Disruptor Weapons Attack)", () => {
    // Sanity: ensure label is exact
    expect(
      METRIC_LABELS.disruptorWeaponsAttackPct || METRIC_LABELS["disruptorWeaponsAttackPct"]
    ).toBe("Disruptor Weapons Attack");

    const html = renderToHtml(<ResearchLevelsModal techKey={"disruptor" as any} />);

    // Header should include the Disruptor metric label exactly
    expect(html).toContain("Disruptor Weapons Attack");

    // Should not include Labs/Requires/Effect block when a single metric column is visible
    expect(html).not.toContain(">Labs<");
    expect(html).not.toContain(">Requires<");
    expect(html).not.toContain(">Effect<");
  });

  test("credits-only tables render just Level and Credits columns (no Labs/Requires/Effect)", () => {
    // Per rule: anti_gravity is credits-only (no metric & no labs/requires/effect)
    const html = renderToHtml(<ResearchLevelsModal techKey={"anti_gravity" as any} />);

    // Must not include the Labs/Requires/Effect headers
    expect(html).not.toContain(">Labs<");
    expect(html).not.toContain(">Requires<");
    expect(html).not.toContain(">Effect<");

    // Should not include any metric headers (we check against known label substrings)
    expect(html).not.toContain("Weapons Attack");
    expect(html).not.toContain("Base Energy Output");
    expect(html).not.toContain("Construction & Production Output");

    // Basic presence checks for Level/Credits headers
    expect(html).toContain(">Level<");
    expect(html).toContain(">Credits<");
  });
});
