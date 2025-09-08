import React from 'react';
import type { BuildingKey } from '@game/shared';
import { STRUCTURE_LEVEL_TABLES, STRUCTURE_LEVEL_META } from './levelTables/structures';
import { useBaseStore } from '../../stores/baseStore';
import { universeService } from '../../services/universeService';

interface StructureLevelsModalProps {
  structureKey: BuildingKey | undefined;
}

const StructureLevelsModal: React.FC<StructureLevelsModalProps> = ({ structureKey }) => {
  if (!structureKey) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No structure selected.</p>
      </div>
    );
  }

  const rows = STRUCTURE_LEVEL_TABLES[structureKey] || [];
  const meta = STRUCTURE_LEVEL_META[structureKey];

  // Dynamic per-base scaling for Metal Refineries (productionOutput)
  const isMetalRefineries = structureKey === 'metal_refineries';
  const isSolarPlants = structureKey === 'solar_plants';
  const isGasPlants = structureKey === 'gas_plants';
  const isUrbanStructures = structureKey === 'urban_structures';
  const isCrystalMines = structureKey === 'crystal_mines';
  const { selectedBaseId, bases } = useBaseStore((s) => ({
    selectedBaseId: s.selectedBaseId,
    bases: s.bases,
  }));
  const selectedBase = React.useMemo(
    () => (selectedBaseId ? bases.find((b) => b._id === selectedBaseId) || null : null),
    [selectedBaseId, bases]
  );
  const [metalRating, setMetalRating] = React.useState<number | null>(null);
  const [solarRating, setSolarRating] = React.useState<number | null>(null);
  const [gasRating, setGasRating] = React.useState<number | null>(null);
  const [crystalRating, setCrystalRating] = React.useState<number | null>(null);
  const [fertilityRating, setFertilityRating] = React.useState<number | null>(null);

  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      if (!isMetalRefineries) return;
      const coord = selectedBase?.locationCoord;
      if (!coord) {
        if (!didCancel) setMetalRating(null);
        return;
      }
      try {
        const res = await universeService.getLocationByCoord(coord);
        if (res?.success && res.data) {
          const d = res.data as any;
          const rating =
            d?.result?.yields?.metal ??
            d?.terrain?.baseline?.metal ??
            null;
          if (!didCancel) setMetalRating(typeof rating === 'number' ? rating : null);
        } else {
          if (!didCancel) setMetalRating(null);
        }
      } catch {
        if (!didCancel) setMetalRating(null);
      }
    }
    load();
    return () => {
      didCancel = true;
    };
  }, [isMetalRefineries, selectedBase?.locationCoord]);

  // Dynamic per-base scaling for Solar Plants (energyOutput)
  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      if (!isSolarPlants) return;
      const coord = selectedBase?.locationCoord;
      if (!coord) {
        if (!didCancel) setSolarRating(null);
        return;
      }
      try {
        const res = await universeService.getLocationByCoord(coord);
        if (res?.success && res.data) {
          const d = res.data as any;
          const rating =
            d?.result?.solarEnergy ??
            d?.positionBase?.solarEnergy ??
            null;
          if (!didCancel) setSolarRating(typeof rating === 'number' ? rating : null);
        } else {
          if (!didCancel) setSolarRating(null);
        }
      } catch {
        if (!didCancel) setSolarRating(null);
      }
    }
    load();
    return () => {
      didCancel = true;
    };
  }, [isSolarPlants, selectedBase?.locationCoord]);

  // Dynamic per-base scaling for Gas Plants (energyOutput depends on gas rating)
  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      if (!isGasPlants) return;
      const coord = selectedBase?.locationCoord;
      if (!coord) {
        if (!didCancel) setGasRating(null);
        return;
      }
      try {
        const res = await universeService.getLocationByCoord(coord);
        if (res?.success && res.data) {
          const d = res.data as any;
          const rating =
            d?.result?.yields?.gas ??
            d?.terrain?.baseline?.gas ??
            null;
          if (!didCancel) setGasRating(typeof rating === 'number' ? rating : null);
        } else {
          if (!didCancel) setGasRating(null);
        }
      } catch {
        if (!didCancel) setGasRating(null);
      }
    }
    load();
    return () => {
      didCancel = true;
    };
  }, [isGasPlants, selectedBase?.locationCoord]);

  // Dynamic per-base scaling for Crystal Mines (economyOutput depends on crystals rating)
  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      if (!isCrystalMines) return;
      const coord = selectedBase?.locationCoord;
      if (!coord) {
        if (!didCancel) setCrystalRating(null);
        return;
      }
      try {
        const res = await universeService.getLocationByCoord(coord);
        if (res?.success && res.data) {
          const d = res.data as any;
          const rating =
            d?.result?.yields?.crystals ??
            d?.terrain?.baseline?.crystals ??
            null;
          if (!didCancel) setCrystalRating(typeof rating === 'number' ? rating : null);
        } else {
          if (!didCancel) setCrystalRating(null);
        }
      } catch {
        if (!didCancel) setCrystalRating(null);
      }
    }
    load();
    return () => {
      didCancel = true;
    };
  }, [isCrystalMines, selectedBase?.locationCoord]);

  // Dynamic per-base scaling for Urban Structures (populationCapacity depends on fertility)
  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      if (!isUrbanStructures) return;
      const coord = selectedBase?.locationCoord;
      if (!coord) {
        if (!didCancel) setFertilityRating(null);
        return;
      }
      try {
        const res = await universeService.getLocationByCoord(coord);
        if (res?.success && res.data) {
          const d = res.data as any;
          const rating =
            d?.result?.fertility ??
            d?.positionBase?.fertility ??
            d?.terrain?.baseline?.fertility ??
            null;
          if (!didCancel) setFertilityRating(typeof rating === 'number' ? rating : null);
        } else {
          if (!didCancel) setFertilityRating(null);
        }
      } catch {
        if (!didCancel) setFertilityRating(null);
      }
    }
    load();
    return () => {
      didCancel = true;
    };
  }, [isUrbanStructures, selectedBase?.locationCoord]);

  // Detect optional columns based on data present
  const hasPopulationCapacity = rows.some((r) => typeof r.populationCapacity === 'number');
  const hasEnergyOutput = rows.some((r: any) => typeof (r as any).energyOutput === 'number');
  const hasResearchOutput = rows.some((r: any) => typeof (r as any).researchOutput === 'number');
  const hasEconomyOutput = rows.some((r: any) => typeof (r as any).economyOutput === 'number');
  const hasTradeRoutes = rows.some((r: any) => typeof (r as any).tradeRoutes === 'number');
  const hasCommandPoints = rows.some((r: any) => typeof (r as any).commandPoints === 'number');
  const hasProductionOutput = rows.some((r: any) => typeof (r as any).productionOutput === 'number');
  const hasIncreasedArea = rows.some((r: any) => typeof (r as any).increasedArea === 'number');

  return (
    <div className="space-y-3">
      {/* Title + Subtitle (redundant with modal title but keeps context when reused) */}
      {meta?.subtitle && (
        <div className="text-sm text-gray-300">{meta.subtitle}</div>
      )}
      {isMetalRefineries && (
        <div className="text-xs text-gray-400">
          {metalRating != null
            ? `Adjusted for base metal rating: ${metalRating} (baseline 3).`
            : 'Baseline shown: metal rating 3. Actual output varies by base.'}
        </div>
      )}
      {isSolarPlants && (
        <div className="text-xs text-gray-400">
          {solarRating != null
            ? `Adjusted for base solar energy: ${solarRating} (baseline 3).`
            : 'Baseline shown: solar energy 3. Actual output varies by base.'}
        </div>
      )}
      {isGasPlants && (
        <div className="text-xs text-gray-400">
          {gasRating != null
            ? `Adjusted for base gas rating: ${gasRating} (baseline 3).`
            : 'Baseline shown: gas rating 3. Actual output varies by base.'}
        </div>
      )}
      {isCrystalMines && (
        <div className="text-xs text-gray-400">
          {crystalRating != null
            ? `Economy output equals base crystals attribute. Using crystals: ${crystalRating}.`
            : 'Crystals unavailable for this base; showing static table values.'}
        </div>
      )}
      {isUrbanStructures && (
        <div className="text-xs text-gray-400">
          {fertilityRating != null
            ? `Population capacity at level = fertility × level. Using fertility: ${fertilityRating}.`
            : 'Fertility unavailable for this base; showing static table values.'}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Level</th>
              <th className="py-2 px-3 text-left">Credits</th>
              {hasPopulationCapacity && (
                <th className="py-2 px-3 text-left">Population Capacity</th>
              )}
              {hasEnergyOutput && (
                <th className="py-2 px-3 text-left">Energy Output</th>
              )}
              {hasResearchOutput && (
                <th className="py-2 px-3 text-left">Research Output</th>
              )}
              {hasEconomyOutput && (
                <th className="py-2 px-3 text-left">Economy Output</th>
              )}
              {hasTradeRoutes && (
                <th className="py-2 px-3 text-left">Trade Routes</th>
              )}
              {hasCommandPoints && (
                <th className="py-2 px-3 text-left">Command Points</th>
              )}
              {hasProductionOutput && (
                <th className="py-2 px-3 text-left">Production Output</th>
              )}
              {hasIncreasedArea && (
                <th className="py-2 px-3 text-left">Increased Area</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    2 +
                    (hasPopulationCapacity ? 1 : 0) +
                    (hasEnergyOutput ? 1 : 0) +
                    (hasResearchOutput ? 1 : 0) +
                    (hasEconomyOutput ? 1 : 0) +
                    (hasTradeRoutes ? 1 : 0) +
                    (hasCommandPoints ? 1 : 0) +
                    (hasProductionOutput ? 1 : 0) +
                    (hasIncreasedArea ? 1 : 0)
                  }
                >
                  No level data available yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.level} className="border-b border-gray-800">
                  <td className="py-2 px-3 text-gray-200">{r.level}</td>
                  <td className="py-2 px-3 text-gray-200">{r.credits.toLocaleString()}</td>
                  {hasPopulationCapacity && (
                    <td className="py-2 px-3 text-gray-200">
                      {isUrbanStructures
                        ? (fertilityRating != null
                            ? Math.round(r.level * fertilityRating).toLocaleString()
                            : (typeof r.populationCapacity === 'number' ? r.populationCapacity.toLocaleString() : ''))
                        : (typeof r.populationCapacity === 'number' ? r.populationCapacity.toLocaleString() : '')}
                    </td>
                  )}
                  {hasEnergyOutput && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).energyOutput === 'number'
                        ? (isSolarPlants
                            ? Math.round(
                                ((r as any).energyOutput as number) * ((solarRating ?? 3) / 3)
                              ).toLocaleString()
                            : isGasPlants
                            ? Math.round(
                                ((r as any).energyOutput as number) * ((gasRating ?? 3) / 3)
                              ).toLocaleString()
                            : (r as any).energyOutput.toLocaleString())
                        : ''}
                    </td>
                  )}
                  {hasResearchOutput && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).researchOutput === 'number' ? (r as any).researchOutput.toLocaleString() : ''}
                    </td>
                  )}
                  {hasEconomyOutput && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).economyOutput === 'number'
                        ? (isCrystalMines
                            ? (crystalRating != null
                                ? Math.round(crystalRating).toLocaleString()
                                : (r as any).economyOutput.toLocaleString())
                            : (r as any).economyOutput.toLocaleString())
                        : ''}
                    </td>
                  )}
                  {hasTradeRoutes && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).tradeRoutes === 'number' ? (r as any).tradeRoutes.toLocaleString() : ''}
                    </td>
                  )}
                  {hasCommandPoints && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).commandPoints === 'number' ? (r as any).commandPoints.toLocaleString() : ''}
                    </td>
                  )}
                  {hasProductionOutput && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).productionOutput === 'number'
                        ? (isMetalRefineries
                            ? Math.round(
                                ((r as any).productionOutput as number) * ((metalRating ?? 3) / 3)
                              ).toLocaleString()
                            : (r as any).productionOutput.toLocaleString())
                        : ''}
                    </td>
                  )}
                  {hasIncreasedArea && (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof (r as any).increasedArea === 'number'
                        ? (r as any).increasedArea.toLocaleString()
                        : ''}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StructureLevelsModal;
