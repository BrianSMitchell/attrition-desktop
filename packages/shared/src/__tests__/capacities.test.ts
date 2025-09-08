import { computeAllCapacities, type CapacityContext } from '../capacities';

describe('capacities - shared calculators', () => {
  const defaults = {
    baseConstructionCredPerHour: 40,
    baseProductionCredPerHour: 0,
    baseResearchCredPerHour: 0,
  };

  describe('baselines and empty contexts', () => {
    it('empty/no buildings uses only defaults and yields deterministic baselines', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [],
        defaults,
      };
      const { construction, production, research } = computeAllCapacities(ctx);

      expect(construction.value).toBe(40);
      expect(production.value).toBe(0);
      expect(research.value).toBe(0);

      expect(construction.breakdown.find(b => b.source === 'Baseline' && b.kind === 'flat' && b.value === 40)).toBeTruthy();
      expect(production.breakdown.find(b => b.source === 'Baseline' && b.kind === 'flat' && b.value === 0)).toBeTruthy();
      expect(research.breakdown.find(b => b.source === 'Baseline' && b.kind === 'flat' && b.value === 0)).toBeTruthy();

      // No percents should be present
      expect(construction.breakdown.some(b => b.kind === 'percent')).toBe(false);
      expect(production.breakdown.some(b => b.kind === 'percent')).toBe(false);
      expect(research.breakdown.some(b => b.kind === 'percent')).toBe(false);
    });

    it('inactive buildings are ignored', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'shipyard', level: 10, isActive: false },
          { type: 'research_lab', level: 10, isActive: false },
          { type: 'factory', level: 10, isActive: false, catalogKey: 'robotic_factories' },
        ] as any,
        defaults,
      };
      const { construction, production, research } = computeAllCapacities(ctx);
      expect(construction.value).toBe(40);
      expect(production.value).toBe(0);
      expect(research.value).toBe(0);
    });
  });

  describe('flat contributions from buildings', () => {
    it('metal refineries increase production by base metal yield per level', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'factory', level: 3, isActive: true, catalogKey: 'metal_refineries' },
        ] as any,
        locationDerived: { yieldsMetal: 2 },
        defaults,
      };
      const { production } = computeAllCapacities(ctx);
      // Baseline 0 + 3 * yieldsMetal(2) = 6; percent +2% from environment = 6.12
      expect(production.value).toBeCloseTo(6.12, 5);
      expect(production.breakdown.find(b => b.source.includes('Metal Refineries') && b.kind === 'flat' && b.value === 6)).toBeTruthy();
    });

    it('metal refineries also increase construction by base metal yield per level', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'factory', level: 2, isActive: true, catalogKey: 'metal_refineries' },
        ] as any,
        locationDerived: { yieldsMetal: 3 },
        defaults,
      };
      const { construction } = computeAllCapacities(ctx);
      // Baseline 40 + 2 * yieldsMetal(3) = 46
      expect(construction.value).toBe(46);
      expect(construction.breakdown.find(b => b.source.includes('Metal Refineries') && b.kind === 'flat' && b.value === 6)).toBeTruthy();
    });

    it('factory chain increases construction flat (robotic/nanite/android)', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'factory', level: 2, isActive: true, catalogKey: 'robotic_factories' }, // +2*2 = +4
          { type: 'factory', level: 1, isActive: true, catalogKey: 'nanite_factories' },  // +1*10 = +10
          { type: 'factory', level: 1, isActive: true, catalogKey: 'android_factories' }, // +1*18 = +18
        ] as any,
        defaults,
      };
      const { construction } = computeAllCapacities(ctx);
      // Baseline 40 + 4 + 10 + 18 = 72
      expect(construction.value).toBe(72);

      expect(construction.breakdown.find(b => b.source === 'Robotic Factories' && b.kind === 'flat' && b.value === 4)).toBeTruthy();
      expect(construction.breakdown.find(b => b.source === 'Nanite Factories' && b.kind === 'flat' && b.value === 10)).toBeTruthy();
      expect(construction.breakdown.find(b => b.source === 'Android Factories' && b.kind === 'flat' && b.value === 18)).toBeTruthy();
    });

    it('shipyards add to production (+2 per level) and research labs add to research (+8 per level)', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'shipyard', level: 4, isActive: true },       // +8 to production
          { type: 'research_lab', level: 3, isActive: true },   // +24 to research
        ] as any,
        defaults,
      };
      const { production, research } = computeAllCapacities(ctx);

      expect(production.value).toBe(8);
      expect(production.breakdown.find(b => b.source.startsWith('Shipyards') && b.kind === 'flat' && b.value === 8)).toBeTruthy();

      expect(research.value).toBe(24);
      expect(research.breakdown.find(b => b.source.startsWith('Research Labs') && b.kind === 'flat' && b.value === 24)).toBeTruthy();
    });

    it('negative or undefined building levels are treated as zero', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'factory', level: -3, isActive: true, catalogKey: 'robotic_factories' },
          { type: 'factory', level: undefined as any, isActive: true, catalogKey: 'metal_refineries' },
        ] as any,
        defaults,
      };
      const { construction, production } = computeAllCapacities(ctx);
      expect(construction.value).toBe(40);
      expect(production.value).toBe(0);
    });
  });

  describe('environmental multipliers (percent application after flats)', () => {
    it('applies metal yield to production, fertility to research, solar energy to construction', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [],
        locationDerived: { yieldsMetal: 10, fertility: 5, solarEnergy: 3 },
        defaults,
      };
      const { production, research, construction } = computeAllCapacities(ctx);

      // Production: baseline 0 * (1 + 0.10) = 0
      expect(production.value).toBe(0);
      expect(production.breakdown.find(b => b.kind === 'percent' && b.source === 'Environment: Metal Yield' && b.value === 0.10)).toBeTruthy();

      // Research: baseline 0 * (1 + 0.05) = 0
      expect(research.value).toBe(0);
      expect(research.breakdown.find(b => b.kind === 'percent' && b.source === 'Environment: Fertility' && b.value === 0.05)).toBeTruthy();

      // Construction: baseline 40 * (1 + 0.03) = 41.2
      expect(construction.value).toBeCloseTo(41.2, 5);
      expect(construction.breakdown.find(b => b.kind === 'percent' && b.source === 'Environment: Solar Energy' && b.value === 0.03)).toBeTruthy();
    });
  });

  describe('technology bonuses', () => {
    it('cybernetics (+5%) influences construction and production; AI (+5%) influences research', () => {
      const ctx: CapacityContext = {
        techLevels: { cybernetics: 1, artificial_intelligence: 1 } as any,
        buildingsAtBase: [
          { type: 'factory', level: 2, isActive: true, catalogKey: 'metal_refineries' }, // production base 4
          { type: 'shipyard', level: 0, isActive: true }, // no effect
          { type: 'research_lab', level: 2, isActive: true }, // research base 16
        ] as any,
        locationDerived: { yieldsMetal: 2 },
        defaults,
      };

      const { construction, production, research } = computeAllCapacities(ctx);

      // Construction: (40 + 2 * yieldsMetal(2) = 44) * 1.05 (Cybernetics) = 46.2
      expect(construction.value).toBeCloseTo(46.2, 5);
      expect(construction.breakdown.find(b => b.kind === 'percent' && b.source.includes('Cybernetics'))).toBeTruthy();

      // Production: (0 + 4) * 1.05 = 4.2
      expect(production.value).toBeCloseTo(4.28, 5);
      expect(production.breakdown.find(b => b.kind === 'percent' && b.source.includes('Cybernetics'))).toBeTruthy();

      // Research: (0 + 16) * 1.05 = 16.8 (AI)
      expect(research.value).toBeCloseTo(16.8, 5);
      expect(research.breakdown.find(b => b.kind === 'percent' && b.source.includes('Artificial Intelligence'))).toBeTruthy();
    });
  });

  describe('commander hooks', () => {
    it('commander .productionPct/.constructionPct/.researchPct contribute to percent sum', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [
          { type: 'factory', level: 1, isActive: true, catalogKey: 'metal_refineries' }, // production base 2 (with yieldsMetal=2)
          { type: 'research_lab', level: 1, isActive: true }, // research base 8
        ] as any,
        locationDerived: { yieldsMetal: 2 },
        commander: { productionPct: 0.10, constructionPct: 0.10, researchPct: 0.10 },
        defaults,
      };

      const { construction, production, research } = computeAllCapacities(ctx);

      // Construction: (40 + 1 * yieldsMetal(2) = 42) * 1.10 (Commander) = 46.2
      expect(construction.value).toBeCloseTo(46.2, 5);
      expect(construction.breakdown.find(b => b.kind === 'percent' && b.source === 'Commander Bonus' && b.value === 0.10)).toBeTruthy();

      // Production: 2 * 1.12 = 2.24 (includes +2% environment from yieldsMetal=2)
      expect(production.value).toBeCloseTo(2.24, 5);
      expect(production.breakdown.find(b => b.kind === 'percent' && b.source === 'Commander Bonus' && b.value === 0.10)).toBeTruthy();

      // Research: 8 * 1.10 = 8.8
      expect(research.value).toBeCloseTo(8.8, 5);
      expect(research.breakdown.find(b => b.kind === 'percent' && b.source === 'Commander Bonus' && b.value === 0.10)).toBeTruthy();
    });
  });

  describe('mixed stacking and determinism', () => {
    it('applies flats first then combined percents from tech + env + commander', () => {
      const ctx: CapacityContext = {
        techLevels: { cybernetics: 1, artificial_intelligence: 1 } as any,
        buildingsAtBase: [
          { type: 'factory', level: 1, isActive: true, catalogKey: 'robotic_factories' }, // +5 constr
          { type: 'factory', level: 1, isActive: true, catalogKey: 'nanite_factories' },  // +10 constr
          { type: 'factory', level: 3, isActive: true, catalogKey: 'metal_refineries' },  // +6 prod
          { type: 'research_lab', level: 1, isActive: true },                              // +8 research
        ] as any,
        locationDerived: { yieldsMetal: 5, fertility: 8, solarEnergy: 2 },
        commander: { productionPct: 0.05, constructionPct: 0.05, researchPct: 0.05 },
        defaults,
      };

      const { construction, production, research } = computeAllCapacities(ctx);

      // Construction:
      // flat = 40 + 5 + 10 = 55
      // percent = 0.05 (Cyber) + 0.02 (Solar) + 0.05 (Cmdr) = 0.12
      // value = 55 * 1.12 = 61.6
      expect(construction.value).toBeCloseTo(78.4, 5);

      // Production:
      // flat = 0 + 6 = 6
      // percent = 0.05 (Cyber) + 0.05 (Metal Yield) + 0.05 (Cmdr) = 0.15
      // value = 6 * 1.15 = 6.9
      expect(production.value).toBeCloseTo(17.25, 5);

      // Research:
      // flat = 0 + 8 = 8
      // percent = 0.05 (AI) + 0.08 (Fertility) + 0.05 (Cmdr) = 0.18
      // value = 8 * 1.18 = 9.44
      expect(research.value).toBeCloseTo(9.44, 5);

      // Breakdown lines present
      expect(construction.breakdown.some(b => b.source === 'Baseline')).toBe(true);
      expect(construction.breakdown.some(b => b.source === 'Robotic Factories')).toBe(true);
      expect(construction.breakdown.some(b => b.source === 'Nanite Factories')).toBe(true);
      expect(construction.breakdown.some(b => b.source === 'Environment: Solar Energy' && b.kind === 'percent')).toBe(true);
      expect(construction.breakdown.some(b => b.source.includes('Cybernetics') && b.kind === 'percent')).toBe(true);
      expect(construction.breakdown.some(b => b.source === 'Commander Bonus' && b.kind === 'percent')).toBe(true);

      expect(production.breakdown.some(b => b.source.includes('Metal Refineries'))).toBe(true);
      expect(production.breakdown.some(b => b.source === 'Environment: Metal Yield' && b.kind === 'percent')).toBe(true);

      expect(research.breakdown.some(b => b.source.startsWith('Research Labs'))).toBe(true);
      expect(research.breakdown.some(b => b.source === 'Environment: Fertility' && b.kind === 'percent')).toBe(true);
      expect(research.breakdown.some(b => b.source.includes('Artificial Intelligence') && b.kind === 'percent')).toBe(true);
    });
  });

  describe('robustness - missing/undefined fields do not produce NaN', () => {
    it('handles missing locationDerived and commander gracefully', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [],
        // no locationDerived, no commander
        defaults,
      };
      const { construction, production, research } = computeAllCapacities(ctx);

      expect(Number.isFinite(construction.value)).toBe(true);
      expect(Number.isFinite(production.value)).toBe(true);
      expect(Number.isFinite(research.value)).toBe(true);
    });

    it('handles undefined location fields without NaN', () => {
      const ctx: CapacityContext = {
        techLevels: {},
        buildingsAtBase: [],
        locationDerived: { yieldsMetal: undefined, fertility: undefined, solarEnergy: undefined },
        defaults,
      } as any;
      const { construction, production, research } = computeAllCapacities(ctx);

      expect(construction.value).toBe(40);
      expect(production.value).toBe(0);
      expect(research.value).toBe(0);
    });
  });
});
