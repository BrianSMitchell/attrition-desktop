/**
 * @jest-environment node
 */
import React from "react";
import * as ReactDOMServer from "react-dom/server";
import StructuresBuildTable from "../../game/StructuresBuildTable";
import ResearchBuildTable from "../../game/ResearchBuildTable";
import DefensesBuildTable from "../../game/DefensesBuildTable";
import UnitsBuildTable from "../../game/UnitsBuildTable";

// Helper to render component to static markup (no need for jsdom or RTL)
function renderToHtml(el: React.ReactElement) {
  return ReactDOMServer.renderToStaticMarkup(el);
}

describe("Tabular Build UI Standard — header/order, right-aligned action, reasons, tooltip, default sort", () => {
  test("Defenses table conforms to headers/order and disabled tooltip with reasons", () => {
    const catalog = [
      { key: "laser_turret", name: "Laser Turret", creditsCost: 200, energyDelta: -2, areaRequired: 1, techPrereqs: [], weapon: "laser", attack: 4, armour: 1, shield: 0 } as any,
      { key: "photon_turret", name: "Photon Turret", creditsCost: 100, energyDelta: -3, areaRequired: 1, techPrereqs: [], weapon: "photon", attack: 6, armour: 2, shield: 1 } as any,
    ];
    const status = {
      eligibility: {
        laser_turret: { canStart: false, reasons: ["Insufficient credits"] },
        photon_turret: { canStart: true, reasons: [] },
      },
    } as any;

    const html = renderToHtml(
      <DefensesBuildTable
        catalog={catalog}
        status={status}
        loading={false}
        onRefresh={() => {}}
        onStart={() => {}}
      />
    );

    // Headers present in the defined order
    const headersOrder = [
      ">Defense<",
      ">Credits<",
      ">Energy<",
      ">Area<",
      ">Requires<",
      // Last action header is right-aligned (has text-right)
      'class="py-2 px-3 text-right">Start<',
    ];
    headersOrder.forEach((needle) => expect(html).toContain(needle));

    // Default sort by credits ascending (100 comes before 200)
    const firstRowIndex = html.indexOf('data-testid="row-');
    const firstKeyStart = html.indexOf("row-", firstRowIndex) + 4;
    const firstKeyEnd = html.indexOf('"', firstKeyStart);
    const firstKey = html.substring(firstKeyStart, firstKeyEnd);
    expect(firstKey).toBe("photon_turret");

    // Reasons line rendered under name for ineligible row
    expect(html).toContain("Insufficient credits");

    // Disabled button tooltip includes reasons (title attr)
    expect(html).toContain('title="Insufficient credits"');
  });

  test("Units table conforms to headers/order and default sort ascending", () => {
    const catalog = [
      { key: "fighter", name: "Fighter", creditsCost: 300, energyDelta: -2, hangar: 1, techPrereqs: [], requiredShipyardLevel: 1 } as any,
      { key: "bomber", name: "Bomber", creditsCost: 150, energyDelta: -3, hangar: 2, techPrereqs: [], requiredShipyardLevel: 1 } as any,
    ];
    const status = {
      eligibility: { fighter: { canStart: true, reasons: [] }, bomber: { canStart: false, reasons: ["Needs labs"] } },
    } as any;

    const html = renderToHtml(
      <UnitsBuildTable catalog={catalog} status={status} loading={false} onRefresh={() => {}} onStart={() => {}} />
    );

    // Headers order
    const headersOrder = [
      ">Unit<",
      ">Credits<",
      ">Energy<",
      ">Hangar<",
      ">Requires<",
      'class="py-2 px-3 text-right">Start<',
    ];
    headersOrder.forEach((needle) => expect(html).toContain(needle));

    // Default sort (150 then 300)
    const firstRowIndex = html.indexOf('data-testid="row-');
    const firstKeyStart = html.indexOf("row-", firstRowIndex) + 4;
    const firstKeyEnd = html.indexOf('"', firstKeyStart);
    const firstKey = html.substring(firstKeyStart, firstKeyEnd);
    expect(firstKey).toBe("bomber");

    // Disabled tooltip present
    expect(html).toContain('title="Needs labs"');
  });

  test("Structures table conforms to headers/order and shows Build action", () => {
    const catalog = [
      { key: "robotic_factories", name: "Robotic Factories", creditsCost: 400, energyDelta: 0, economy: 0, populationRequired: 1, areaRequired: 1, advanced: false, techPrereqs: [] } as any,
      { key: "spaceports", name: "Spaceports", creditsCost: 200, energyDelta: 0, economy: 2, populationRequired: 0, areaRequired: 1, advanced: false, techPrereqs: [] } as any,
    ];
    const status = { eligibility: { robotic_factories: { canStart: false, reasons: ["Queued"] }, spaceports: { canStart: true, reasons: [] } } } as any;
    const levels = { robotic_factories: 0, spaceports: 0 } as any;

    const html = renderToHtml(
      <StructuresBuildTable
        catalog={catalog}
        status={status}
        levels={levels}
        loading={false}
        onRefresh={() => {}}
        onStart={() => {}}
        constructionPerHour={undefined}
        activeConstruction={null}
      />
    );

    const headersOrder = [
      ">Structure<",
      ">Credits<",
      ">Energy<",
      ">Economy<",
      ">Population<",
      ">Area<",
      ">Advanced<",
      ">Requires<",
      ">Time<",
      'class="py-2 px-3 text-right">Build<',
    ];
    headersOrder.forEach((needle) => expect(html).toContain(needle));

    // Default sort by credits ascending (200 first)
    const firstRowIndex = html.indexOf('data-testid="row-');
    const firstKeyStart = html.indexOf("row-", firstRowIndex) + 4;
    const firstKeyEnd = html.indexOf('"', firstKeyStart);
    const firstKey = html.substring(firstKeyStart, firstKeyEnd);
    expect(firstKey).toBe("spaceports");

    // Reasons rendered and tooltip on disabled
    expect(html).toContain("Queued");
    expect(html).toContain('title="Queued"');
  });

  test("Research table conforms to headers/order and shows Start action (Time may be —)", () => {
    const catalog = [
      { key: "laser", name: "Laser", description: "", creditsCost: 120, requiredLabs: 2, prerequisites: [] } as any,
      { key: "photon", name: "Photon", description: "", creditsCost: 60, requiredLabs: 1, prerequisites: [] } as any,
    ];
    const status = {
      credits: 1000,
      baseLabTotal: 3,
      techLevels: { laser: 0, photon: 0 },
      eligibility: { laser: { canStart: false, reasons: ["Insufficient labs"] }, photon: { canStart: true, reasons: [] } },
    } as any;

    const html = renderToHtml(
      <ResearchBuildTable
        catalog={catalog}
        status={status}
        loading={false}
        onRefresh={() => {}}
        onStart={() => {}}
        researchPerHour={undefined}
        activeResearch={null}
      />
    );

    const headersOrder = [
      ">Technology<",
      ">Credits<",
      ">Labs<",
      ">Requires<",
      ">Effect<",
      ">Time<",
    ];
    headersOrder.forEach((needle) => expect(html).toContain(needle));
    // Action header acceptance: allow "Start" or "Start / Queue"
    const actionHeaderVariants = [
      'class="py-2 px-3 text-right">Start<',
      'class="py-2 px-3 text-right">Start / Queue<',
    ];
    expect(actionHeaderVariants.some((v) => html.includes(v))).toBe(true);

    // Default sort by credits ascending (60 then 120)
    const firstRowIndex = html.indexOf('data-testid="row-');
    const firstKeyStart = html.indexOf("row-", firstRowIndex) + 4;
    const firstKeyEnd = html.indexOf('"', firstKeyStart);
    const firstKey = html.substring(firstKeyStart, firstKeyEnd);
    expect(firstKey).toBe("photon");

    // Reasons rendered and tooltip on disabled
    expect(html).toContain("Insufficient labs");
    expect(html).toContain('title="Insufficient labs"');
  });
});
