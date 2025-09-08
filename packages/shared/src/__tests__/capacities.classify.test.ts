/// <reference types="jest" />
import { computeAllCapacities, classifyCapacityBreakdown, type CapacityContext } from '../capacities';

describe('capacities - classifyCapacityBreakdown helper', () => {
  const defaults = {
    baseConstructionCredPerHour: 40,
    baseProductionCredPerHour: 0,
    baseResearchCredPerHour: 0,
  };

  it('groups baseline, buildings, location, tech, commander correctly (construction)', () => {
    const ctx: CapacityContext = {
      techLevels: { cybernetics: 1, artificial_intelligence: 1 } as any,
      buildingsAtBase: [
        { type: 'factory', level: 1, isActive: true, catalogKey: 'robotic_factories' },
        { type: 'factory', level: 3, isActive: true, catalogKey: 'metal_refineries' },
        { type: 'shipyard', level: 2, isActive: true },
        { type: 'research_lab', level: 1, isActive: true },
      ] as any,
      locationDerived: { yieldsMetal: 2, fertility: 1, solarEnergy: 1 },
      commander: { productionPct: 0.05, constructionPct: 0.05, researchPct: 0.05 },
      defaults,
    };

    const { construction } = computeAllCapacities(ctx);
    const groups = classifyCapacityBreakdown(construction.breakdown);

    expect(groups.baseline.length).toBe(1);
    expect(groups.buildings.some(b => b.source === 'Robotic Factories')).toBe(true);
    // Metal Refineries also contribute to construction in our model
    expect(groups.buildings.some(b => b.source.startsWith('Metal Refineries'))).toBe(true);
    expect(groups.location.some(b => b.source === 'Environment: Solar Energy')).toBe(true);
    expect(groups.tech.some(b => b.source.startsWith('Tech: Cybernetics'))).toBe(true);
    expect(groups.commander.some(b => b.source === 'Commander Bonus')).toBe(true);
    expect(groups.other.length).toBe(0);
  });

  it('groups expected sources for production and research', () => {
    const ctx: CapacityContext = {
      techLevels: { cybernetics: 1, artificial_intelligence: 1 } as any,
      buildingsAtBase: [
        { type: 'factory', level: 2, isActive: true, catalogKey: 'metal_refineries' },
        { type: 'shipyard', level: 3, isActive: true },
        { type: 'research_lab', level: 2, isActive: true },
      ] as any,
      locationDerived: { yieldsMetal: 4, fertility: 3, solarEnergy: 0 },
      commander: { productionPct: 0.10, constructionPct: 0, researchPct: 0.10 },
      defaults,
    };

    const { production, research } = computeAllCapacities(ctx);

    const prod = classifyCapacityBreakdown(production.breakdown);
    expect(prod.baseline.length).toBe(1);
    expect(prod.buildings.some(b => b.source === 'Shipyards (+2 per level)')).toBe(true);
    expect(prod.buildings.some(b => b.source.startsWith('Metal Refineries'))).toBe(true);
    expect(prod.location.some(b => b.source === 'Environment: Metal Yield')).toBe(true);
    expect(prod.tech.some(b => b.source.startsWith('Tech: Cybernetics'))).toBe(true);
    expect(prod.commander.some(b => b.source === 'Commander Bonus')).toBe(true);
    expect(prod.other.length).toBe(0);

    const res = classifyCapacityBreakdown(research.breakdown);
    expect(res.baseline.length).toBe(1);
    expect(res.buildings.some(b => b.source.startsWith('Research Labs'))).toBe(true);
    expect(res.location.some(b => b.source === 'Environment: Fertility')).toBe(true);
    expect(res.tech.some(b => b.source.startsWith('Tech: Artificial Intelligence'))).toBe(true);
    expect(res.commander.some(b => b.source === 'Commander Bonus')).toBe(true);
    expect(res.other.length).toBe(0);
  });

  it('handles empty/undefined input gracefully', () => {
    const empty = classifyCapacityBreakdown(undefined as any);
    expect(empty.baseline.length).toBe(0);
    expect(empty.buildings.length).toBe(0);
    expect(empty.location.length).toBe(0);
    expect(empty.tech.length).toBe(0);
    expect(empty.commander.length).toBe(0);
    expect(empty.other.length).toBe(0);
  });
});
