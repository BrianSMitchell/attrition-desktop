import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FleetListRow } from '../../services/fleetsService';
import type {
  TechnologySpec,
  TechnologyKey,
  BuildingSpec,
  DefenseSpec,
  UnitSpec,
  BuildingKey
} from '@game/shared';
import { getBuildingsList, computeEnergyBalance } from '@game/shared';
import techService, { TechStatusDTO } from '../../services/techService';
import structuresService, { StructuresStatusDTO } from '../../services/structuresService';
import defensesService, { DefensesStatusDTO } from '../../services/defensesService';
import unitsService, { UnitsStatusDTO } from '../../services/unitsService';
import fleetsService from '../../services/fleetsService';
import PlanetInfoBlock from './PlanetInfoBlock';
import PlanetVisual from './PlanetVisual';
import baseStatsService, { BaseStatsDTO } from '../../services/baseStatsService';
import basesService from '../../services/basesService';
import universeService from '../../services/universeService';
import StructuresBuildTable from './StructuresBuildTable';
import ResearchBuildTable from './ResearchBuildTable';
import ResearchQueuePanel from './ResearchQueuePanel';
import StructuresQueuePanel from './StructuresQueuePanel';
import DefensesBuildTable from './DefensesBuildTable';
import UnitsBuildTable from './UnitsBuildTable';
import capacitiesService, { CapacitiesDTO } from '../../services/capacitiesService';
import StatLink from '../ui/StatLink';
import { useAuthStore } from '../../stores/authStore';
import { useModalStore } from '../../stores/modalStore';
import type { Building } from '@game/shared';
import { useNetwork } from '../../contexts/NetworkContext';
import { useToast } from '../../contexts/ToastContext';

/** Helpers for building display names (catalog-key-first) */
const getBuildingLabel = (b: Building | ClientBuilding): string => {
  // 1. Primary: API-provided displayName (basesService.getBaseStructures gives canonical names)
  if (b.displayName && b.displayName.trim().length > 0) return b.displayName;

  // 2. Fallback: catalogSpec lookup (shared catalog is authoritative)
  if (b.catalogKey) {
    try {
      const buildings = getBuildingsList();
      const spec = buildings.find(spec => spec.key === b.catalogKey);
      if (spec) return spec.name;
    } catch {
      // catalog not yet loaded, fall through to fallback
    }
  }

  // 3. Last resort: catalog key itself
  return b.catalogKey || 'Unknown Structure';
};

// Local helper type to reflect file-based buildings for overview display
// Making construction fields optional to handle mock data without type errors
type ClientBuilding = {
  _id: string;
  type: Building['type']; // Simpler type needed for overview display
  displayName?: string;
  catalogKey?: string;
  level: number;
  isActive: boolean;
  constructionStarted?: Date | null; // Optional for mock data
  constructionCompleted?: Date | null; // Optional for mock data
  empireId: string;
  locationCoord: string;
};

const formatEta = (date?: string | Date | null) => {
  if (!date) return '';
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'Completing...';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
};

function StatItem({
  label,
  main,
  sub
}: {
  label: string;
  main: React.ReactNode;
  sub?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-lg text-white font-mono">{main}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

interface BaseDetailProps {
  base: any;
  onBack: () => void;
  initialActivePanel?: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade';
  onPanelChange?: (panel: 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade') => void;
  onStart?: (key: string) => Promise<void> | void;
}

const BaseDetail: React.FC<BaseDetailProps> = ({ base, onBack, initialActivePanel, onPanelChange, onStart }) => {
  const [activePanel, setActivePanel] = useState<
    'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade'
  >(initialActivePanel ?? 'overview');
  const [refreshKey, setRefreshKey] = useState(0);
  // Sync with initialActivePanel from props (e.g., ?tab= in URL) so back/forward and refresh restore the tab
  useEffect(() => {
    if (initialActivePanel && initialActivePanel !== activePanel) {
      setActivePanel(initialActivePanel);
    }
  }, [initialActivePanel]);
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3000);
  };

  // Live buildings for Overview
  const [buildings, setBuildings] = useState<ClientBuilding[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState<string | null>(null);

  // Fleets (Garrison) state
  const [fleetsLoading, setFleetsLoading] = useState(false);
  const [fleetsError, setFleetsError] = useState<string | null>(null);
  const [fleets, setFleets] = useState<FleetListRow[]>([]);

  // Fleets (Overview) — MVP renders a single "Garrison" row based on completed unit production

  // Header budgets (Area/Energy/Population)
  const [baseStats, setBaseStats] = useState<BaseStatsDTO | null>(null);
  const { checkAuth } = useAuthStore();
  const { openModal } = useModalStore();

  const refreshHeaderBudgets = async () => {
    if (!base?.locationCoord) return;
    try {
      const res = await baseStatsService.get(base.locationCoord);
      if (res.success && res.data) {
        setBaseStats(res.data.stats);
      }
    } catch {
      // ignore transient errors
    } finally {
      setRefreshKey((k) => k + 1);
    }
  };

  const loadBuildings = async () => {
    try {
      setBuildingsError(null);
      setBuildingsLoading(true);
      const res = await basesService.getBaseStructures(base.locationCoord);
      if (res.success && res.data) {
        // Convert to legacy format for Overview display
        const convertedBuildings: ClientBuilding[] = [];
        for (const item of res.data.items) {
          if (item.currentLevel > 0) {
            const building: ClientBuilding = {
              _id: `${base.locationCoord}-${item.key}`,
              type: 'metal_mine', // Legacy type - not used in display
              level: item.currentLevel,
              isActive: true,
              constructionStarted: null,
              constructionCompleted: null,
              displayName: item.name,
              catalogKey: item.key,
              empireId: base.empireId || '',
              locationCoord: base.locationCoord
            };
            convertedBuildings.push(building);
          }
        }
        setBuildings(convertedBuildings);
      } else {
        setBuildingsError(res.error || 'Failed to load buildings');
      }
    } catch {
      setBuildingsError('Network error');
    } finally {
      setBuildingsLoading(false);
    }
  };

  const loadFleets = async () => {
    if (!base?.locationCoord) return;
    try {
      setFleetsError(null);
      setFleetsLoading(true);
      const res = await fleetsService.getFleets(base.locationCoord);
      if (res.success && res.data) {
        setFleets(Array.isArray(res.data.fleets) ? res.data.fleets : []);
      } else {
        setFleetsError(res.error || 'Failed to load fleets');
      }
    } catch {
      setFleetsError('Network error');
    } finally {
      setFleetsLoading(false);
    }
  };

  useEffect(() => {
    if (activePanel === 'overview' && base?.locationCoord) {
      loadBuildings();
      loadFleets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord]);

  // While any structures are under construction on Overview, poll and bump refreshKey
  useEffect(() => {
    if (activePanel !== 'overview') return;
    if (!buildings || buildings.length === 0) return;
    const hasInactive = buildings.some((b) => !b.isActive);
    if (!hasInactive) return;

    const id = window.setInterval(() => {
      loadBuildings();
      setRefreshKey((k) => k + 1);
    }, 15000);

    return () => {
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, buildings]);

  // Research state
  const [catalog, setCatalog] = useState<TechnologySpec[]>([]);
  const [status, setStatus] = useState<TechStatusDTO | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [activeResearch, setActiveResearch] = useState<{ key: TechnologyKey; completesAt: string } | null>(null);

  // Structures state
  const [structuresCatalog, setStructuresCatalog] = useState<BuildingSpec[]>([]);
  const [structuresStatus, setStructuresStatus] = useState<StructuresStatusDTO | null>(null);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [structuresError, setStructuresError] = useState<string | null>(null);
  const [baseLevels, setBaseLevels] = useState<Partial<Record<BuildingKey, number>>>({});
  const [activeConstruction, setActiveConstruction] = useState<{ key: BuildingKey; completionAt: string } | null>(null);
  const [constructionPerHour, setConstructionPerHour] = useState<number | undefined>(undefined);

  // Capacities state (for time calculations in Structures table)
  const [capacities, setCapacities] = useState<CapacitiesDTO | null>(null);
  // Planet energy context for per-base Solar/Gas hints in Structures table
  const [planetSolarEnergy, setPlanetSolarEnergy] = useState<number | null>(null);
  const [planetGasYield, setPlanetGasYield] = useState<number | null>(null);
  // Additional planet context for Metal/Crystals/Fertility hints
  const [planetMetalYield, setPlanetMetalYield] = useState<number | null>(null);
  const [planetCrystalsYield, setPlanetCrystalsYield] = useState<number | null>(null);
  const [planetFertility, setPlanetFertility] = useState<number | null>(null);

  // Defenses state
  const [defensesCatalog, setDefensesCatalog] = useState<DefenseSpec[]>([]);
  const [defensesStatus, setDefensesStatus] = useState<DefensesStatusDTO | null>(null);
  const [defensesLoading, setDefensesLoading] = useState(false);
  const [defensesError, setDefensesError] = useState<string | null>(null);

  // Units state
  const [unitsCatalog, setUnitsCatalog] = useState<UnitSpec[]>([]);
  const [unitsStatus, setUnitsStatus] = useState<UnitsStatusDTO | null>(null);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const loadResearchData = async () => {
    try {
      setResearchError(null);
      const [catRes, statRes] = await Promise.all([
        techService.getCatalog(),
        techService.getStatus(base.locationCoord)
      ]);
      if (catRes.success) setCatalog(catRes.data!.catalog);
      else setResearchError(catRes.error || 'Failed to load catalog');

      if (statRes.success) setStatus(statRes.data!.status);
      else setResearchError(statRes.error || 'Failed to load status');
    } catch (e) {
      setResearchError('Failed to load research data');
    }
  };

  const loadResearchQueue = async () => {
    if (!base?.locationCoord) return;
    try {
      const res = await techService.getQueue(base.locationCoord);
      if (res.success && res.data) {
        const queue = res.data.queue || [];
        const first = queue.length > 0 ? queue[0] : null;
        if (first) {
          setActiveResearch({
            key: first.techKey as TechnologyKey,
            completesAt: String(first.completesAt),
          });
        } else {
          setActiveResearch(null);
        }
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    if (activePanel === 'research') {
      loadResearchData();
      loadResearchQueue();
      loadCapacitiesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord]);

  const loadStructuresData = async () => {
    try {
      setStructuresError(null);
      setStructuresLoading(true);
      const [catRes, statRes] = await Promise.all([
        structuresService.getCatalog(),
        structuresService.getStatus()
      ]);
      if (catRes.success) setStructuresCatalog(catRes.data!.catalog);
      else setStructuresError(catRes.error || 'Failed to load structures catalog');

      if (statRes.success) setStructuresStatus(statRes.data!.status);
      else setStructuresError(statRes.error || 'Failed to load structures status');
    } catch (e) {
      setStructuresError('Failed to load structures data');
    } finally {
      setStructuresLoading(false);
    }
  };
  
  const loadBaseStructures = async () => {
    if (!base?.locationCoord) return;
    try {
      const res = await basesService.getBaseStructures(base.locationCoord);
      if (res.success && res.data) {
        const map: Partial<Record<BuildingKey, number>> = {};
        for (const item of res.data.items) {
          map[item.key as BuildingKey] = item.currentLevel || 0;
        }
        setBaseLevels(map);
        setConstructionPerHour(res.data.constructionPerHour);
        setActiveConstruction(res.data.activeConstruction ?? null);
      }
    } catch {
      // non-fatal
    }
  };
  
  // Fetch capacities for this base to compute "Time" in table
  const loadCapacitiesData = async () => {
    if (!base?.locationCoord) return;
    try {
      const res = await capacitiesService.getStatus(base.locationCoord);
      if (res.success && res.data) {
        setCapacities(res.data);
      }
    } catch {
      // non-fatal
    }
  };

  // Fetch planet-specific energy context for Solar/Gas Plants hinting
  const loadPlanetEnergyContext = async () => {
    if (!base?.locationCoord) return;
    try {
      const res = await universeService.getLocationByCoord(base.locationCoord);
      if (res.success && res.data) {
        setPlanetSolarEnergy(typeof res.data.result?.solarEnergy === 'number' ? res.data.result!.solarEnergy : null);
        setPlanetGasYield(typeof res.data.result?.yields?.gas === 'number' ? res.data.result!.yields!.gas : null);
        setPlanetMetalYield(typeof res.data.result?.yields?.metal === 'number' ? res.data.result!.yields!.metal : null);
        setPlanetCrystalsYield(typeof res.data.result?.yields?.crystals === 'number' ? res.data.result!.yields!.crystals : null);
        setPlanetFertility(typeof res.data.result?.fertility === 'number' ? res.data.result!.fertility : null);
      }
    } catch {
      // non-fatal
    }
  };

  const loadBaseLevels = async () => {
    // Already handled by loadBaseStructures() which also updates baseLevels
    return;
  };

  const { isFullyConnected } = useNetwork();
  const { addToast } = useToast();
  const { empire } = useAuthStore();

  const handleStart = async (key: string) => {
    if (!isFullyConnected) {
      if (!empire) {
        addToast({ type: 'error', text: 'Not authenticated' });
        return;
      }
      const payload = {
        empireId: empire._id,
        locationCoord: base.locationCoord,
        catalogKey: key,
      };
      const options = {
        identityKey: `${empire._id}:${base.locationCoord}:${key}`,
      };
      if (!window.desktop?.eventQueue) {
        addToast({ type: 'error', text: 'Desktop API not available' });
        return;
      }
      const res = await window.desktop.eventQueue.enqueue('structures', payload, options);
      if (res?.success) {
        addToast({ type: 'success', text: `Queued ${key} for sync` });
      } else {
        addToast({ type: 'error', text: res?.error || 'Failed to queue structure' });
      }
      return;
    }
    onStart?.(key);
  };

  const handleQueue = async (s: BuildingSpec): Promise<{ success: boolean; eventId?: number }> => {
    if (!empire) {
      addToast({ type: 'error', text: 'Not authenticated' });
      return { success: false };
    }
    const payload = {
      empireId: empire._id,
      locationCoord: base.locationCoord,
      catalogKey: s.key,
    };
    const options = {
      identityKey: `${empire._id}:${base.locationCoord}:${s.key}`,
    };
    if (!window.desktop?.eventQueue) {
      addToast({ type: 'error', text: 'Desktop API not available' });
      return { success: false };
    }
    const res = await window.desktop.eventQueue.enqueue('structures', payload, options);
    if (res?.success) {
      addToast({ type: 'success', text: `Queued ${s.name} for sync` });
      return { success: true, eventId: res.eventId ? parseInt(res.eventId) : undefined };
    } else {
      addToast({ type: 'error', text: res?.error || 'Failed to queue structure' });
      return { success: false };
    }
  };

  useEffect(() => {
    if (activePanel === 'structures') {
      loadStructuresData();
      loadBaseStructures();
      loadCapacitiesData();
      loadBaseLevels();
      loadPlanetEnergyContext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel]);

  const loadDefensesData = async () => {
    try {
      setDefensesError(null);
      setDefensesLoading(true);
      const [catRes, statRes] = await Promise.all([
        defensesService.getCatalog(),
        defensesService.getStatus()
      ]);
      if (catRes.success) setDefensesCatalog(catRes.data!.catalog);
      else setDefensesError(catRes.error || 'Failed to load defenses catalog');

      if (statRes.success) setDefensesStatus(statRes.data!.status);
      else setDefensesError(statRes.error || 'Failed to load defenses status');
    } catch (e) {
      setDefensesError('Failed to load defenses data');
    } finally {
      setDefensesLoading(false);
    }
  };

  useEffect(() => {
    if (activePanel === 'defense') {
      loadDefensesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord]);

  const loadUnitsData = async () => {
    try {
      setUnitsError(null);
      setUnitsLoading(true);
      const [catRes, statRes] = await Promise.all([
        unitsService.getCatalog(),
        unitsService.getStatus()
      ]);
      if (catRes.success) setUnitsCatalog(catRes.data!.catalog);
      else setUnitsError(catRes.error || 'Failed to load units catalog');

      if (statRes.success) setUnitsStatus(statRes.data!.status);
      else setUnitsError(statRes.error || 'Failed to load units status');
    } catch (e) {
      setUnitsError('Failed to load units data');
    } finally {
      setUnitsLoading(false);
    }
  };

  useEffect(() => {
    if (activePanel === 'fleet') {
      loadUnitsData();
      loadCapacitiesData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord]);

  // Fetch header budgets (area/energy/population) for this base location
  useEffect(() => {
    let mounted = true;
    setBaseStats(null);
    if (base?.locationCoord) {
      baseStatsService
        .get(base.locationCoord)
        .then((res) => {
          if (!mounted) return;
          if (res.success && res.data) {
            setBaseStats(res.data.stats);
          }
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [base?.locationCoord]);

  // View Energy Breakdown (modal)
  /**
   * Authoritative sources:
   * - Server totals via baseStatsService.get()
   * - Per-structure metadata via @game/shared catalogs (energyDelta)
   * - Planet context via universeService.getLocationByCoord (solarEnergy, gasYield)
   * - Totals computed with computeEnergyBalance({ includeQueuedReservations: true })
   */
  const handleViewEnergyBreakdown = async () => {
    try {
      if (!base?.locationCoord) return;

      const [structuresRes, planetRes] = await Promise.all([
        basesService.getBaseStructures(base.locationCoord),
        universeService.getLocationByCoord(base.locationCoord)
      ]);

      if (!structuresRes.success || !structuresRes.data) return;

      const items = structuresRes.data.items || [];
      const levels: Record<string, number> = {};
      for (const it of items) {
        levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
      }

      const solarEnergy = typeof (planetRes as any)?.data?.result?.solarEnergy === 'number'
        ? (planetRes as any).data.result.solarEnergy
        : 0;
      const gasYield = typeof (planetRes as any)?.data?.result?.yields?.gas === 'number'
        ? (planetRes as any).data.result.yields.gas
        : 0;

      const buildingsAtBase = Object.entries(levels)
        .filter(([_, lv]) => (lv || 0) > 0)
        .map(([key, lv]) => ({ key, level: lv as number, isActive: true }));

      const totals = computeEnergyBalance({
        buildingsAtBase,
        location: { solarEnergy, gasYield },
        includeQueuedReservations: true
      });

      // Build per-source breakdown using shared catalog specs
      const catalog = getBuildingsList();
      const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
      const deltaByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.energyDelta || 0)]));

      const baseline = 2;
      const solar = (levels['solar_plants'] || 0) * solarEnergy;
      const gas = (levels['gas_plants'] || 0) * gasYield;

      const producers: Array<{ key: string; name: string; value: number }> = [];
      const consumers: Array<{ key: string; name: string; value: number }> = [];

      for (const [key, lv] of Object.entries(levels)) {
        if (!lv) continue;
        if (key === 'solar_plants' || key === 'gas_plants') continue;

        const d = deltaByKey.get(key as BuildingKey) || 0;
        if (!d) continue;

        const name = nameByKey.get(key as BuildingKey) || key;
        if (d >= 0) {
          producers.push({ key, name, value: lv * d });
        } else {
          consumers.push({ key, name, value: lv * Math.abs(d) });
        }
      }

      openModal('energy_breakdown', {
        coord: base.locationCoord,
        totals,
        breakdown: {
          baseline,
          solar,
          gas,
          producers: producers.sort((a, b) => b.value - a.value),
          consumers: consumers.sort((a, b) => b.value - a.value),
        },
      });
    } catch {
      // non-fatal
    }
  };

  // View Area Usage Breakdown (modal)
  /**
   * Authoritative sources:
   * - Server totals via baseStatsService.get() (area.used/free/total)
   * - Per-structure area via @game/shared catalogs (areaRequired × level)
   * - Sorted descending by per-structure area consumption
   */
  const handleViewAreaBreakdown = async () => {
    try {
      if (!base?.locationCoord) return;

      const structuresRes = await basesService.getBaseStructures(base.locationCoord);
      if (!structuresRes.success || !structuresRes.data) return;

      const items = structuresRes.data.items || [];
      const levels: Record<string, number> = {};
      for (const it of items) {
        levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
      }

      const catalog = getBuildingsList();
      const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
      const areaByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.areaRequired || 0)]));

      const consumers: Array<{ key: string; name: string; value: number }> = [];
      for (const [key, lv] of Object.entries(levels)) {
        if (!lv) continue;
        const a = areaByKey.get(key as BuildingKey) || 0;
        if (!a) continue;
        const name = nameByKey.get(key as BuildingKey) || key;
        consumers.push({ key, name, value: lv * a });
      }

      openModal('area_breakdown', {
        coord: base.locationCoord,
        totals: {
          used: baseStats?.area.used ?? 0,
          free: baseStats?.area.free ?? 0,
          total: baseStats?.area.total ?? 0
        },
        breakdown: {
          consumers: consumers.sort((a, b) => b.value - a.value)
        }
      });
    } catch {
      // non-fatal
    }
  };

  // View Population Breakdown (modal)
  /**
   * Authoritative sources:
   * - Server totals via baseStatsService.get() (population.used/free/capacity)
   * - Per-structure users via @game/shared catalogs (populationRequired × level)
   * - Capacity sources: placeholder (totals-only note if none defined)
   */
  const handleViewPopulationBreakdown = async () => {
    try {
      if (!base?.locationCoord) return;

      const structuresRes = await basesService.getBaseStructures(base.locationCoord);
      if (!structuresRes.success || !structuresRes.data) return;

      const items = structuresRes.data.items || [];
      const levels: Record<string, number> = {};
      for (const it of items) {
        levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
      }

      const catalog = getBuildingsList();
      const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
      const popReqByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.populationRequired || 0)]));

      const users: Array<{ key: string; name: string; value: number }> = [];
      for (const [key, lv] of Object.entries(levels)) {
        if (!lv) continue;
        const p = popReqByKey.get(key as BuildingKey) || 0;
        if (!p) continue;
        const name = nameByKey.get(key as BuildingKey) || key;
        users.push({ key, name, value: lv * p });
      }

      openModal('population_breakdown', {
        coord: base.locationCoord,
        totals: {
          used: baseStats?.population.used ?? 0,
          free: baseStats?.population.free ?? 0,
          capacity: baseStats?.population.capacity ?? 0
        },
        breakdown: {
          users: users.sort((a, b) => b.value - a.value),
          sources: []
        }
      });
    } catch {
      // non-fatal
    }
  };

  return (
    <div className="space-y-6">
      {/* Base Header */}
      <div className="game-card">
        <div className="flex items-center mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to overview"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-empire-gold">{base.name}</h1>
              <p className="text-gray-400 font-mono">{base.locationCoord}</p>
            </div>
          </div>
        </div>

        {baseStats && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatItem
              label="Area Usage"
              main={
                <span className={baseStats.area.free > 0 ? 'text-green-300' : 'text-red-300'}>
                  {baseStats.area.used.toLocaleString()} / {baseStats.area.total.toLocaleString()}
                </span>
              }
              sub={
                <StatLink
                  onClick={handleViewAreaBreakdown}
                  dataTestId="area-breakdown-link"
                  title="View breakdown ⟶"
                />
              }
            />
            <StatItem
              label="Energy Balance"
              main={
                <span className={baseStats.energy.balance >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {baseStats.energy.balance.toLocaleString()}
                </span>
              }
              sub={
                <StatLink
                  onClick={handleViewEnergyBreakdown}
                  dataTestId="energy-breakdown-link"
                  title="View breakdown ⟶"
                />
              }
            />
            <StatItem
              label="Population"
              main={
                <span className={baseStats.population.free > 0 ? 'text-green-300' : 'text-red-300'}>
                  {baseStats.population.used.toLocaleString()} / {baseStats.population.capacity.toLocaleString()}
                </span>
              }
              sub={
                <StatLink
                  onClick={handleViewPopulationBreakdown}
                  dataTestId="population-breakdown-link"
                  title="View breakdown ⟶"
                />
              }
            />
          </div>
        )}

        {/* Base Planet Info */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Planet picture (same style as Planet page) */}
          <div className="p-4 rounded-lg border border-gray-600 bg-gray-800/60 flex items-center justify-center">
            <PlanetVisual coord={base.locationCoord} className="w-56 h-56 md:w-64 md:h-64" />
          </div>

          {/* Right: Planet information (details + link) */}
          <div className="p-4 rounded-lg border border-gray-600 bg-gray-800/60">
            <PlanetInfoBlock coord={base.locationCoord} refreshKey={refreshKey} showBudgets={false} />
          </div>
        </div>
      </div>

      {/* Panel Navigation */}
      <div className="game-card">
        <div className="flex border-b border-gray-600">
          <button
            data-testid="tab-overview"
            onClick={() => { setActivePanel('overview'); onPanelChange?.('overview'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'overview'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📋 Overview
          </button>
          <button
            data-testid="tab-fleet"
            onClick={() => { setActivePanel('fleet'); onPanelChange?.('fleet'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'fleet'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🚀 Production
          </button>
          <button
            data-testid="tab-defense"
            onClick={() => { setActivePanel('defense'); onPanelChange?.('defense'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'defense'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🛡️ Defense
          </button>
          <button
            data-testid="tab-research"
            onClick={() => { setActivePanel('research'); onPanelChange?.('research'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'research'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🔬 Research
          </button>
          <button
            data-testid="tab-structures"
            onClick={() => { setActivePanel('structures'); onPanelChange?.('structures'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'structures'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🏗️ Structures
          </button>
          <button
            data-testid="tab-trade"
            onClick={() => { setActivePanel('trade'); onPanelChange?.('trade'); }}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === 'trade'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            💱 Trade
          </button>
        </div>
      </div>

      {notice && (
        <div className="game-card">
          <div data-testid="notice-banner" className="p-3 bg-blue-900/50 border border-blue-700 rounded-md text-blue-200">
            {notice}
          </div>
        </div>
      )}

      {/* Panel Content */}
      {activePanel === 'overview' && (
        <div className="space-y-6">
          {/* Fleets */}
          <div className="game-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-empire-gold">Fleets</h3>
              <button
                onClick={loadFleets}
                className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {fleetsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {fleetsError && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
                {fleetsError}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-gray-300">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-1 pr-4">Fleet</th>
                    <th className="text-left py-1 pr-4">Player</th>
                    <th className="text-left py-1 pr-4">Arrival</th>
                    <th className="text-right py-1">Size</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {fleets.length > 0 ? (
                    fleets.map((f) => (
                      <tr key={f._id} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4">
                          <Link to={`/fleets/${f._id}`} className="text-blue-300 hover:text-blue-200">
                            {f.name}
                          </Link>
                        </td>
                        <td className="py-1 pr-4 text-gray-200">{f.ownerName || '—'}</td>
                        <td className="py-1 pr-4 text-gray-300">—</td>
                        <td className="py-1 text-right font-mono">{f.sizeCredits.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        No fleets detected in orbit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Structures (mock data) */}
          <div className="game-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-empire-gold">Structures</h3>
              <button
                onClick={loadBuildings}
                className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {buildingsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {buildingsError && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
                {buildingsError}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left column - main structures */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-300">
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-1 pr-4">Structures</th>
                      <th className="text-right py-1">Level</th>
                      <th className="text-left py-1 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {buildings.map((b, i) => (
                      <tr key={b._id || i} className="border-b border-gray-800/60">
                        <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                        <td className="py-1 text-right font-mono">{b.level}</td>
                        <td className="py-1 pl-4">
                          {b.isActive ? (
                            <span className="text-green-400">Active</span>
                          ) : (
                            <span className="text-yellow-300">
                              Under construction • ETA {formatEta(b.constructionCompleted)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right column - special structures + defenses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Special structures */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300">
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-1 pr-4">Structures</th>
                        <th className="text-right py-1">Level</th>
                        <th className="text-left py-1 pl-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {buildings
                        .filter((b) => b.type === 'command_center' || b.type === 'shipyard')
                        .map((b, i) => (
                          <tr key={b._id || i} className="border-b border-gray-800/60">
                            <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                            <td className="py-1 text-right font-mono">{b.level}</td>
                            <td className="py-1 pl-4">
                              {b.isActive ? (
                                <span className="text-green-400">Active</span>
                              ) : (
                                <span className="text-yellow-300">
                                  Under construction • ETA {formatEta(b.constructionCompleted)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Defenses */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300">
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-1 pr-4">Defenses</th>
                        <th className="text-right py-1">Level</th>
                        <th className="text-left py-1 pl-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {buildings
                        .filter((b) => b.type === 'defense_station')
                        .map((b, i) => (
                          <tr key={b._id || i} className="border-b border-gray-800/60">
                            <td className="py-1 pr-4 text-gray-200">{getBuildingLabel(b)}</td>
                            <td className="py-1 text-right font-mono">{b.level}</td>
                            <td className="py-1 pl-4">
                              {b.isActive ? (
                                <span className="text-green-400">Active</span>
                              ) : (
                                <span className="text-yellow-300">
                                  Under construction • ETA {formatEta(b.constructionCompleted)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'structures' && (
        <div className="space-y-6">
          {structuresError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              {structuresError}
            </div>
          )}
          <StructuresQueuePanel
            baseCoord={base.locationCoord}
            onChanged={async () => {
              await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
              await loadStructuresData();
              await loadCapacitiesData();
              await loadBaseLevels();
              await loadPlanetEnergyContext();
            }}
          />
          <StructuresBuildTable
            catalog={structuresCatalog}
            status={structuresStatus}
            levels={baseLevels}
            loading={structuresLoading}
            onRefresh={() => {
              loadStructuresData();
              loadCapacitiesData();
              loadBaseLevels();
              loadPlanetEnergyContext();
            }}
            onStart={handleStart}
            onQueue={handleQueue}
            isOffline={!isFullyConnected}
            actionLabel={(_s, eligible, isLoading, isOffline) => {
              if (isLoading) return "...";
              if (isOffline) {
                return eligible ? "Queue" : "Unavailable";
              }
              return eligible ? "Build" : "Unavailable";
            }}
            constructionPerHour={constructionPerHour ?? capacities?.construction?.value}
            activeConstruction={activeConstruction}
            locationCoord={base.locationCoord}
            planetSolarEnergy={planetSolarEnergy ?? undefined}
            planetGasYield={planetGasYield ?? undefined}
            planetMetalYield={planetMetalYield ?? undefined}
            planetCrystalsYield={planetCrystalsYield ?? undefined}
            planetFertility={planetFertility ?? undefined}
          />
        </div>
      )}

      {activePanel === 'trade' && (
        <div className="game-card text-center">
          <div className="py-12">
            <div className="text-6xl mb-4">💱</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-300">Trade Center</h3>
            <p className="text-gray-400 mb-6">
              Trade systems are coming soon. Use the Structures tab to build infrastructure that unlocks trading.
            </p>
          </div>
        </div>
      )}

      {activePanel === 'fleet' && (
        <div className="space-y-6">
          {unitsError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              {unitsError}
            </div>
          )}
          <UnitsBuildTable
            catalog={unitsCatalog}
            status={unitsStatus}
            loading={unitsLoading}
            onRefresh={loadUnitsData}
            productionPerHour={capacities?.production?.value}
            onSubmit={async (items, totals) => {
              try {
                setUnitsError(null);
                let queued = 0;
                let conflicts = 0;
                let failed = 0;
                const failedReasons: string[] = [];

                // Submit each unit quantity as individual start requests (Phase A API is per-unit)
                for (const { key, quantity } of items) {
                  const qty = Math.max(0, Math.floor(quantity || 0));
                  for (let i = 0; i < qty; i++) {
                    try {
                      const res: any = await unitsService.start(base.locationCoord, key as any);
                      if (res?.success) {
                        queued++;
                      } else if ((res?.code === 'ALREADY_IN_PROGRESS') || res?.status === 409) {
                        conflicts++;
                      } else {
                        failed++;
                        const msg = (res?.message || res?.error || 'Failed');
                        if (Array.isArray(res?.reasons) && res.reasons.length) {
                          failedReasons.push(...res.reasons);
                        } else {
                          failedReasons.push(String(msg));
                        }
                      }
                    } catch (e: any) {
                      failed++;
                      const msg = e?.response?.data?.message || e?.message || 'Request failed';
                      const reasons = e?.response?.data?.reasons;
                      if (Array.isArray(reasons) && reasons.length) {
                        failedReasons.push(...reasons);
                      } else {
                        failedReasons.push(String(msg));
                      }
                    }
                  }
                }

                // Refresh auth/resources and units status after submissions
                await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
                await loadUnitsData();

                // Build summary notice using original totals time
                const h = Math.floor(totals.minutes / 60);
                const m = totals.minutes % 60;
                const timeText = h > 0 ? `${h}h ${m}m` : `${m}m`;
                showNotice(
                  `Queued ${queued.toLocaleString()} • conflicts ${conflicts.toLocaleString()} • failed ${failed.toLocaleString()} • ${timeText}`
                );

                if (failed > 0) {
                  const unique = Array.from(new Set(failedReasons.map(String)));
                  setUnitsError(`Some items failed: ${unique.join('; ')}`);
                }
              } catch {
                setUnitsError('Production submission failed.');
              }
            }}
          />
        </div>
      )}

      {activePanel === 'defense' && (
        <div className="space-y-6">
          {defensesError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              {defensesError}
            </div>
          )}
          <DefensesBuildTable
            catalog={defensesCatalog}
            status={defensesStatus}
            loading={defensesLoading}
            onRefresh={loadDefensesData}
            onStart={async (key) => {
              try {
                setDefensesLoading(true);
                setDefensesError(null);
                const res = await defensesService.start(base.locationCoord, key);
                if (!res.success) {
                  if (res.code === 'ALREADY_IN_PROGRESS') {
                    // Soft-path: Show non-destructive message and refresh data
                    console.info('Defense already in progress:', res.message);
                    showNotice('Already in progress — refreshed.');
                    // Refresh data to show current state
                    await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
                    await loadDefensesData();
                  } else {
                    setDefensesError(res.error || res.message || 'Failed to start defense');
                  }
                } else {
                  await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
                  await loadDefensesData();
                }
              } catch {
                setDefensesError('Network error');
              } finally {
                setDefensesLoading(false);
              }
            }}
          />
        </div>
      )}

      {activePanel === 'research' && (
        <div className="space-y-6">
          <ResearchQueuePanel
            baseCoord={base.locationCoord}
            onChanged={async () => {
              await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
              await loadResearchData();
              await loadResearchQueue();
              await loadCapacitiesData();
            }}
          />
          {researchError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              {researchError}
            </div>
          )}
          <ResearchBuildTable
            catalog={catalog}
            status={status}
            loading={researchLoading}
            researchPerHour={capacities?.research?.value}
            activeResearch={activeResearch}
            onRefresh={() => {
              loadResearchData();
              loadResearchQueue();
              loadCapacitiesData();
            }}
            onStart={async (techKey) => {
              try {
                setResearchLoading(true);
                setResearchError(null);
                const result = await techService.start(base.locationCoord, techKey as TechnologyKey);
                if (!result.success) {
                  if (result.code === 'ALREADY_IN_PROGRESS') {
                    // Soft-path: Show non-destructive message and refresh data
                    console.info('Research already in progress:', result.message);
                    showNotice('Already in progress — refreshed.');
                    // Refresh data to show current state
                    await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
                    await loadResearchData();
                    await loadResearchQueue();
                    await loadCapacitiesData();
                  } else {
                    setResearchError(result.error || result.message || 'Failed to start technology');
                  }
                } else {
                  await Promise.all([checkAuth(true), refreshHeaderBudgets()]);
                  await loadResearchData();
                  await loadResearchQueue();
                  await loadCapacitiesData();
                }
              } catch {
                setResearchError('Network error');
              } finally {
                setResearchLoading(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BaseDetail;
