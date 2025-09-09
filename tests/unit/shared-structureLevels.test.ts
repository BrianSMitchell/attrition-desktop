import { getStructureCreditCostForLevel, hasCanonicalStructureCostForLevel } from '../structureLevels';
import { getBuildingSpec } from '../buildings';

describe('structureLevels canonical costs', () => {
  describe('L1 costs align with buildings catalog', () => {
    it('antimatter_plants L1 matches catalog', () => {
      const spec = getBuildingSpec('antimatter_plants');
      expect(getStructureCreditCostForLevel('antimatter_plants', 1)).toBe(spec.creditsCost);
    });

    it('orbital_plants L1 matches catalog', () => {
      const spec = getBuildingSpec('orbital_plants');
      expect(getStructureCreditCostForLevel('orbital_plants', 1)).toBe(spec.creditsCost);
    });

    it('nanite_factories L1 matches catalog', () => {
      const spec = getBuildingSpec('nanite_factories');
      expect(getStructureCreditCostForLevel('nanite_factories', 1)).toBe(spec.creditsCost);
    });

    it('jump_gate L1 matches catalog', () => {
      const spec = getBuildingSpec('jump_gate');
      expect(getStructureCreditCostForLevel('jump_gate', 1)).toBe(spec.creditsCost);
    });

    it('biosphere_modification L1 matches catalog', () => {
      const spec = getBuildingSpec('biosphere_modification');
      expect(getStructureCreditCostForLevel('biosphere_modification', 1)).toBe(spec.creditsCost);
    });

    it('capital L1 matches catalog', () => {
      const spec = getBuildingSpec('capital');
      expect(getStructureCreditCostForLevel('capital', 1)).toBe(spec.creditsCost);
    });
  });

  describe('Progression values (spot checks)', () => {
    it('orbital_plants L4 = 135000', () => {
      expect(getStructureCreditCostForLevel('orbital_plants', 4)).toBe(135000);
    });

    it('nanite_factories L3 = 180', () => {
      expect(getStructureCreditCostForLevel('nanite_factories', 3)).toBe(180);
    });

    it('jump_gate L5 = 25313', () => {
      expect(getStructureCreditCostForLevel('jump_gate', 5)).toBe(25313);
    });

    it('biosphere_modification L9 = 512580', () => {
      expect(getStructureCreditCostForLevel('biosphere_modification', 9)).toBe(512580);
    });

    it('capital L5 = 75938', () => {
      expect(getStructureCreditCostForLevel('capital', 5)).toBe(75938);
    });
  });

  describe('hasCanonicalStructureCostForLevel returns true for defined levels', () => {
    it('antimatter_plants L9', () => {
      expect(hasCanonicalStructureCostForLevel('antimatter_plants', 9)).toBe(true);
    });
    it('orbital_plants L9', () => {
      expect(hasCanonicalStructureCostForLevel('orbital_plants', 9)).toBe(true);
    });
    it('nanite_factories L13', () => {
      expect(hasCanonicalStructureCostForLevel('nanite_factories', 13)).toBe(true);
    });
    it('jump_gate L9', () => {
      expect(hasCanonicalStructureCostForLevel('jump_gate', 9)).toBe(true);
    });
    it('biosphere_modification L9', () => {
      expect(hasCanonicalStructureCostForLevel('biosphere_modification', 9)).toBe(true);
    });
    it('capital L9', () => {
      expect(hasCanonicalStructureCostForLevel('capital', 9)).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('throws on non-positive level', () => {
      expect(() => getStructureCreditCostForLevel('capital', 0)).toThrow();
      expect(() => getStructureCreditCostForLevel('capital', -1)).toThrow();
    });
  });
});
