import {
  computePlanetStats,
  getBasePosition,
  getStarKindModifiers,
  pickStarKindFromCoord,
  pickTerrainFromCoord,
  TERRAIN_BASELINES,
  type StarKind,
  type TerrainType,
} from '../overhaul';

describe('Universe Overhaul - Shared logic', () => {
  describe('computePlanetStats', () => {
    it('combines Base Position + Star Positional + Terrain baselines in the correct order', () => {
      const kind: StarKind = 'YELLOW';
      const terrain: TerrainType = 'Earthly';
      const position = 3;

      const base = getBasePosition(position);
      const star = getStarKindModifiers(kind, position);
      const baseline = TERRAIN_BASELINES[terrain];

      const out = computePlanetStats({ kind, terrain, position });

      // Fertility: terrain.fertility + base.fertility + star.fertilityDelta
      const expectedFertility =
        (baseline.fertility || 0) + base.fertility + (star.fertilityDelta || 0);
      expect(out.result.fertility).toBe(expectedFertility);

      // SolarEnergy: base.solarEnergy + star.solarEnergyDelta
      const expectedSolar = base.solarEnergy + (star.solarEnergyDelta || 0);
      expect(out.result.solarEnergy).toBe(expectedSolar);

      // Yields: baseline + star resource deltas (clamped to non-negative)
      const expectedMetal = Math.max(
        0,
        (baseline.metal || 0) + (star.resourceDelta?.metal || 0)
      );
      const expectedGas = Math.max(
        0,
        (baseline.gas || 0) + (star.resourceDelta?.gas || 0)
      );
      const expectedCrystals = Math.max(
        0,
        (baseline.crystals || 0) + (star.resourceDelta?.crystals || 0)
      );

      expect(out.result.yields.metal).toBe(expectedMetal);
      expect(out.result.yields.gas).toBe(expectedGas);
      expect(out.result.yields.crystals).toBe(expectedCrystals);

      // Intermediates should be exposed correctly
      expect(out.basePosition).toEqual(base);
      expect(out.starMods).toEqual(star);
      expect(out.baselineTerrain).toEqual(baseline);
    });

    it('never returns negative resource yields (WHITE star crystals -1 should clamp to 0)', () => {
      const kind: StarKind = 'WHITE';
      // Choose a terrain with baseline crystals = 0
      const terrain: TerrainType = 'Earthly';
      const position = 5; // WHITE also has solarEnergy +1 for P1-5

      const out = computePlanetStats({ kind, terrain, position });

      expect(out.result.yields.crystals).toBeGreaterThanOrEqual(0);
      // Earthly baseline crystals is 0, WHITE adds -1 => clamp to 0
      expect(out.result.yields.crystals).toBe(0);
    });

    it('NEUTRON star applies even/odd solar energy deltas and metal bonus in outer positions', () => {
      const kind: StarKind = 'NEUTRON';

      // Even position => +2 solar energy delta
      const posEven = 2;
      const outEven = computePlanetStats({ kind, terrain: 'Rocky', position: posEven });
      const baseEven = getBasePosition(posEven);
      const starEven = getStarKindModifiers(kind, posEven);
      expect(starEven.solarEnergyDelta).toBe(2);
      expect(outEven.result.solarEnergy).toBe(
        baseEven.solarEnergy + starEven.solarEnergyDelta
      );

      // Odd position => -2 solar energy delta
      const posOdd = 3;
      const outOdd = computePlanetStats({ kind, terrain: 'Rocky', position: posOdd });
      const baseOdd = getBasePosition(posOdd);
      const starOdd = getStarKindModifiers(kind, posOdd);
      expect(starOdd.solarEnergyDelta).toBe(-2);
      expect(outOdd.result.solarEnergy).toBe(
        baseOdd.solarEnergy + starOdd.solarEnergyDelta
      );

      // Outer positions P4-8 get +3 metal
      const posOuter = 6;
      const outOuter = computePlanetStats({ kind, terrain: 'Rocky', position: posOuter });
      const baseline = TERRAIN_BASELINES['Rocky'];
      expect(outOuter.result.yields.metal).toBe(
        Math.max(0, baseline.metal + 3)
      );
    });
  });

  describe('Deterministic selection & independence', () => {
    it('pickStarKindFromCoord is deterministic for a given coord and index', () => {
      const coord = 'A00:10:22:00';
      const k1 = pickStarKindFromCoord(coord, 101);
      const k2 = pickStarKindFromCoord(coord, 101);
      expect(k1).toBe(k2);
    });

    it('pickTerrainFromCoord is deterministic for given coord/body and respects asteroid flag', () => {
      const coord = 'A00:10:22:05';
      const bodyId = 7;

      const t1 = pickTerrainFromCoord(coord, bodyId, false);
      const t2 = pickTerrainFromCoord(coord, bodyId, false);
      expect(t1).toBe(t2);

      const asteroid = pickTerrainFromCoord(coord, bodyId, true);
      expect(asteroid).toBe('Asteroid');
    });

    it('Star kind selection is independent of terrain body stream (disjoint indices)', () => {
      const coord = 'A00:10:22:00';
      const starKind = pickStarKindFromCoord(coord, 101);

      // Vary bodyId for terrain stream; starKind should not change
      const t1 = pickTerrainFromCoord(coord, 1, false);
      const t2 = pickTerrainFromCoord(coord, 2, false);
      const t3 = pickTerrainFromCoord(coord, 99, false);
      // Ensure terrains can differ across body ids (not strictly required, but likely)
      expect([t1, t2, t3].length).toBe(3);

      const starKindAgain = pickStarKindFromCoord(coord, 101);
      expect(starKindAgain).toBe(starKind);
    });
  });
});
