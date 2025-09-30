import React, { useMemo, useState } from 'react';
import { Empire, getTechnologyList, getTechSpec, TechnologySpec, getStructuresList as getBuildingsList, StructureSpec as BuildingSpec, getDefensesList, DefenseSpec, getUnitsList, UnitSpec, TERRAIN_BASELINES, getBasePosition, getStarKindModifiers, STAR_KIND_WEIGHTS } from '@game/shared';
import type { StarKind } from '@game/shared';

type InfoTab = 'technologies' | 'structures' | 'defenses' | 'units' | 'capacities' | 'terrains' | 'all';

interface GameInfoModalProps {
  empire: Empire;
  onUpdate: () => void;
  initialTab?: InfoTab;
}

const tabs: { key: InfoTab; label: string }[] = [
  { key: 'technologies', label: 'Technologies' },
  { key: 'structures', label: 'Structures' },
  { key: 'defenses', label: 'Defenses' },
  { key: 'units', label: 'Units' },
  { key: 'capacities', label: 'Capacities' },
  { key: 'terrains', label: 'Terrains' },
  { key: 'all', label: 'All' }
];

const SectionHeaderStrip: React.FC<{ active: InfoTab; setActive: (k: InfoTab) => void }> = ({ active, setActive }) => {
  return (
    <div className="mb-4">
      <div className="flex gap-1 bg-gray-700 p-1 rounded-lg border border-gray-600">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active === t.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const TechnologiesTable: React.FC = () => {
  const techs = useMemo<TechnologySpec[]>(
    () => getTechnologyList().slice().sort((a, b) => a.creditsCost - b.creditsCost),
    []
  );

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Technologies</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Technology</th>
              <th className="py-2 px-3 text-left">Credits</th>
              <th className="py-2 px-3 text-left">Labs Level</th>
              <th className="py-2 px-3 text-left">Requires</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t) => {
              const requires =
                t.prerequisites.length === 0
                  ? '—'
                  : t.prerequisites
                      .map((p) => `${getTechSpec(p.key).name} ${p.level}`)
                      .join(', ');
              return (
                <tr key={t.key} className="border-b border-gray-800 hover:bg-gray-800/60">
                  <td className="py-2 px-3">
                    <div className="text-white">{t.name}</div>
                    {t.description ? (
                      <div className="text-xs text-gray-400">{t.description}</div>
                    ) : null}
                  </td>
                  <td className="py-2 px-3 text-gray-200">{t.creditsCost.toLocaleString()}</td>
                  <td className="py-2 px-3 text-gray-200">{t.requiredLabs}</td>
                  <td className={`py-2 px-3 ${t.prerequisites.length ? 'text-red-400' : 'text-gray-400'}`}>
                    {requires}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StructuresTable: React.FC = () => {
  const structs = useMemo<BuildingSpec[]>(
    () => getBuildingsList().slice().sort((a, b) => a.creditsCost - b.creditsCost),
    []
  );

  const getStructureEffect = (s: BuildingSpec): string => {
    switch (s.key) {
      case 'urban_structures':
        return 'Increases population capacity by base fertility.';
      case 'solar_plants':
        return 'Increases base energy output by base solar energy.';
      case 'gas_plants':
        return 'Increases base energy output by base gas resource.';
      case 'fusion_plants':
      case 'antimatter_plants':
      case 'orbital_plants':
        return `Increases base energy output by ${s.energyDelta}.`;
      case 'research_labs':
        return 'Increases bases research by 8, allows new technologies.';
      case 'metal_refineries':
        return 'Increases production and construction by base metal resource.';
      case 'crystal_mines':
        return 'Increases economy by base crystals resource.';
      case 'robotic_factories':
        return 'Increases production and construction by 2.';
      case 'shipyards':
        return 'Increases production by 2 and allows new units.';
      case 'orbital_shipyards':
        return 'Increases production by 8 and allows new units.';
      case 'spaceports':
        return `Increases economy by ${s.economy} and allows trade routes.`;
      case 'command_centers':
        return 'Adds 5% fleet attack power at base and allows 1 occupation.';
      case 'nanite_factories':
        return 'Increases production and construction by 4.';
      case 'android_factories':
        return 'Increases production and construction by 6.';
      case 'economic_centers':
        return `Increases economy by ${s.economy}.`;
      case 'terraform':
        return 'Increases base area by 5.';
      case 'multi_level_platforms':
        return 'Increases base area by 10.';
      case 'orbital_base':
        return 'Increases population capacity by 10.';
      case 'jump_gate':
        return 'Increases fleet speed by 70% and allows travel between galaxies.';
      case 'biosphere_modification':
        return 'Increases planet fertility by 1.';
      case 'capital':
        return 'Increases economy by 10 and other bases by 1. -15% empire income while occupied.';
      default:
        if (s.energyDelta > 0) return `Increases base energy output by ${s.energyDelta}.`;
        if (s.energyDelta < 0) return `Consumes ${Math.abs(s.energyDelta)} energy.`;
        if (s.economy > 0) return `Increases economy by ${s.economy}.`;
        return '—';
    }
  };

  const NO_AREA_KEYS: Array<BuildingSpec['key']> = ['orbital_base', 'jump_gate'];

  const AREA_INCREASE: Partial<Record<BuildingSpec['key'], number>> = {
    terraform: 5,
    multi_level_platforms: 10,
  };

  const renderArea = (s: BuildingSpec): string => {
    if (NO_AREA_KEYS.includes(s.key)) return '';
    const inc = AREA_INCREASE[s.key as keyof typeof AREA_INCREASE];
    if (typeof inc === 'number') return `+${inc}`;
    if (typeof s.areaRequired === 'number') {
      return s.areaRequired === 0 ? '' : `-${s.areaRequired}`;
    }
    // Default: most items cost 1 area
    return '-1';
  };

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Structures</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Structure</th>
              <th className="py-2 px-3 text-left">Credits</th>
              <th className="py-2 px-3 text-left">Energy</th>
              <th className="py-2 px-3 text-left">Economy</th>
              <th className="py-2 px-3 text-left">Population</th>
              <th className="py-2 px-3 text-left">Area</th>
              <th className="py-2 px-3 text-left">Advanced</th>
              <th className="py-2 px-3 text-left">Requires</th>
            </tr>
          </thead>
          <tbody>
            {structs.map((s) => {
              const requires =
                s.techPrereqs.length === 0
                  ? '—'
                  : s.techPrereqs
                      .map((p) => `${getTechSpec(p.key).name} ${p.level}`)
                      .join(', ');
              return (
                <tr key={s.key} className="border-b border-gray-800 hover:bg-gray-800/60">
                  <td className="py-2 px-3">
                    <div className="text-white">{s.name}</div>
                    <div className="text-xs text-gray-400">{getStructureEffect(s)}</div>
                  </td>
                  <td className="py-2 px-3 text-gray-200">{s.creditsCost.toLocaleString()}</td>
                  <td className="py-2 px-3 text-gray-300">
                    {
                      (s.key === 'solar_plants' || s.key === 'gas_plants')
                        ? ''
                        : (s.energyDelta === 0 ? '' : String(s.energyDelta))
                    }
                  </td>
                  <td className="py-2 px-3 text-gray-300">{s.economy === 0 ? '' : s.economy}</td>
                  <td className="py-2 px-3 text-gray-300">{s.key === 'orbital_base' ? '+10' : (s.populationRequired === 0 ? '' : `-${s.populationRequired}`)}</td>
                  <td className="py-2 px-3 text-gray-300">{renderArea(s)}</td>
                  <td className="py-2 px-3 text-gray-300">{s.advanced ? 'x' : ''}</td>
                  <td className={`py-2 px-3 ${s.techPrereqs.length ? 'text-red-400' : 'text-gray-400'}`}>
                    {requires}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DefensesTable: React.FC = () => {
  const defs = useMemo<DefenseSpec[]>(
    () => getDefensesList().slice().sort((a, b) => a.creditsCost - b.creditsCost),
    []
  );

  const getDefenseDescription = (key: DefenseSpec['key']): string => {
    switch (key) {
      case 'barracks':
        return 'Help protect your bases, the cheapest defense.';
      case 'laser_turrets':
        return 'Small defenses, good against small units.';
      case 'missile_turrets':
        return 'Small defenses, good against small and medium units.';
      case 'plasma_turrets':
        return 'Average defenses, good against medium units.';
      case 'ion_turrets':
        return 'Average defenses, good against medium units.';
      case 'photon_turrets':
        return 'Big defenses, good against large units.';
      case 'disruptor_turrets':
        return 'Biggest turrets, good against large units.';
      case 'deflection_shields':
        return 'Strong shields that increase bases protection.';
      case 'planetary_shield':
        return 'Planetary shields that increases bases protection.';
      case 'planetary_ring':
        return 'Planetary defensive ring.';
      default:
        return '';
    }
  };

  const renderArea = (d: DefenseSpec): string => {
    if (typeof d.areaRequired === 'number') {
      return d.areaRequired === 0 ? '' : `-${d.areaRequired}`;
    }
    // Default: most items cost 1 area
    return '-1';
  };

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Defenses</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Defense</th>
              <th className="py-2 px-3 text-left">Credits</th>
              <th className="py-2 px-3 text-left">Weapon</th>
              <th className="py-2 px-3 text-left">Attack</th>
              <th className="py-2 px-3 text-left">Armour</th>
              <th className="py-2 px-3 text-left">Shield</th>
              <th className="py-2 px-3 text-left">Energy</th>
              <th className="py-2 px-3 text-left">Area</th>
              <th className="py-2 px-3 text-left">Requires</th>
            </tr>
          </thead>
          <tbody>
            {defs.map((d) => {
              const requires =
                d.techPrereqs.length === 0
                  ? '—'
                  : d.techPrereqs
                      .map((p) => `${getTechSpec(p.key).name} ${p.level}`)
                      .join(', ');
              return (
                <tr key={d.key} className="border-b border-gray-800 hover:bg-gray-800/60">
                  <td className="py-2 px-3">
                    <div className="text-white">{d.name}</div>
                    <div className="text-xs text-gray-400">{getDefenseDescription(d.key)}</div>
                  </td>
                  <td className="py-2 px-3 text-gray-200">{d.creditsCost.toLocaleString()}</td>
                  <td className="py-2 px-3 text-gray-300">{d.weapon ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{d.attack ? d.attack : ''}</td>
                  <td className="py-2 px-3 text-gray-300">{d.armour ? d.armour : ''}</td>
                  <td className="py-2 px-3 text-gray-300">
                    {typeof d.shield === 'number' && d.shield !== 0 ? d.shield : ''}
                  </td>
                  <td className="py-2 px-3 text-gray-300">{d.energyDelta === 0 ? '' : String(d.energyDelta)}</td>
                  <td className="py-2 px-3 text-gray-300">{renderArea(d)}</td>
                  <td className={`py-2 px-3 ${d.techPrereqs.length ? 'text-red-400' : 'text-gray-400'}`}>
                    {requires}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Each level of defenses requires 1 Population.
      </p>
    </div>
  );
};

const UnitsTable: React.FC = () => {
  const units = useMemo<UnitSpec[]>(
    () => getUnitsList().slice().sort((a, b) => a.creditsCost - b.creditsCost),
    []
  );

  const renderShipyardReq = (u: UnitSpec) => {
    if (u.requiredShipyardLevel && u.requiredOrbitalShipyardLevel) {
      return `${u.requiredShipyardLevel} (${u.requiredOrbitalShipyardLevel})`;
    }
    if (u.requiredShipyardLevel) {
      return `${u.requiredShipyardLevel}`;
    }
    return '—';
  };

  // Fallback description mapping to ensure subtitle shows even if catalog omits description
  const getUnitDescription = (key: UnitSpec['key']): string => {
    switch (key) {
      case 'fighter':
        return 'Good fighting unit against unshielded units.';
      case 'bomber':
        return 'Good fighting unit against unshielded and low shield units.';
      case 'cruiser':
        return 'Versatile unit, good for long range action and escort.';
      case 'carrier':
        return 'Unit with 80 hangar spaces.';
      case 'fleet_carrier':
        return 'Large carrier with 500 hangar spaces.';
      case 'death_star':
        return 'Biggest unit, can’t use jump gates, gives +10% power and armour to fleet.';
      default:
        return '';
    }
  };

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Units</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Unit</th>
              <th className="py-2 px-3 text-left">Credits</th>
              <th className="py-2 px-3 text-left">Drive</th>
              <th className="py-2 px-3 text-left">Weapon</th>
              <th className="py-2 px-3 text-left">Attack</th>
              <th className="py-2 px-3 text-left">Armour</th>
              <th className="py-2 px-3 text-left">Shield</th>
              <th className="py-2 px-3 text-left">Hangar</th>
              <th className="py-2 px-3 text-left">Speed</th>
              <th className="py-2 px-3 text-left">Shipyard</th>
              <th className="py-2 px-3 text-left">Requires</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const requires =
                u.techPrereqs.length === 0
                  ? '—'
                  : u.techPrereqs.map((p) => `${getTechSpec(p.key).name} ${p.level}`).join(', ');
              return (
                <tr key={u.key} className="border-b border-gray-800 hover:bg-gray-800/60">
                  <td className="py-2 px-3">
                    <div className="text-white">{u.name}</div>
                    {(u.description ?? getUnitDescription(u.key)) ? (
                      <div className="text-xs text-gray-400">{u.description ?? getUnitDescription(u.key)}</div>
                    ) : null}
                  </td>
                  <td className="py-2 px-3 text-gray-200">{u.creditsCost.toLocaleString()}</td>
                  <td className="py-2 px-3 text-gray-300">{u.drive ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.weapon ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.attack ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.armour ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.shield ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.hangar ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{u.speed ?? '—'}</td>
                  <td className="py-2 px-3 text-gray-300">{renderShipyardReq(u)}</td>
                  <td className={`py-2 px-3 ${u.techPrereqs.length ? 'text-red-400' : 'text-gray-400'}`}>{requires}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-gray-400 space-y-1">
        <p>* Can move a galaxy away (200 distance).</p>
        <p>Note: Shipyard 20 (1) means that it requires Shipyard Level 20 and Orbital Shipyard Level 1.</p>
      </div>
    </div>
  );
};

const CapacitiesSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="game-card !bg-gray-900 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Capacities</h3>
        </div>

        <div className="space-y-6 text-sm text-gray-200">
          {/* Construction Capacity */}
          <div>
            <h4 className="text-base font-semibold text-white mb-1">Construction Capacity</h4>
            <p className="text-gray-300 mb-2">
              Determines how quickly structures and defenses are built at a base. Measured in credits per hour (cred/h).
            </p>
            <ul className="list-disc ml-5 text-gray-300 space-y-1">
              <li><span className="text-empire-gold">New Base Baseline:</span> 40 cred/h (even with no capacity buildings).</li>
              <li><span className="text-empire-gold">Metal Refineries:</span> + base metal resource value per level.</li>
              <li><span className="text-empire-gold">Robotic Factories:</span> +2 per level.</li>
              <li><span className="text-empire-gold">Nanite Factories:</span> +4 per level.</li>
              <li><span className="text-empire-gold">Android Factories:</span> +6 per level.</li>
              <li><span className="text-empire-gold">Cybernetics Technology:</span> +5% across all bases.</li>
              <li><span className="text-empire-gold">Construction Commander:</span> reduces construction time by 1% per commander level. (Hook)</li>
            </ul>
            <div className="mt-2 p-2 rounded bg-gray-800 border border-gray-700 text-gray-200">
              <div className="text-gray-300">Formula</div>
              <div className="font-mono text-gray-100">Construction Time (hours) = Structure Cost (credits) / Construction Capacity (cred/h)</div>
            </div>
          </div>

          {/* Production Capacity */}
          <div>
            <h4 className="text-base font-semibold text-white mb-1">Production Capacity</h4>
            <p className="text-gray-300 mb-2">
              Determines how quickly ships and goods are produced at a base. Measured in cred/h.
            </p>
            <ul className="list-disc ml-5 text-gray-300 space-y-1">
              <li><span className="text-empire-gold">Baseline:</span> 0 cred/h (requires structures/tech to increase).</li>
              <li><span className="text-empire-gold">Shipyards:</span> +2 per level.</li>
              <li><span className="text-empire-gold">Orbital Shipyards:</span> +8 per level.</li>
              <li><span className="text-empire-gold">Metal Refineries:</span> + base metal resource value per level.</li>
              <li><span className="text-empire-gold">Robotic Factories:</span> +2 per level.</li>
              <li><span className="text-empire-gold">Nanite Factories:</span> +4 per level.</li>
              <li><span className="text-empire-gold">Android Factories:</span> +6 per level.</li>
              <li><span className="text-empire-gold">Cybernetics Technology:</span> +5% across all bases.</li>
              <li><span className="text-empire-gold">Production Commander:</span> reduces production time by 1% per commander level. (Hook)</li>
              <li><span className="text-empire-gold">Double Production:</span> optional mode to halve time for extra cost. (Planned)</li>
            </ul>
            <div className="mt-2 p-2 rounded bg-gray-800 border border-gray-700 text-gray-200">
              <div className="text-gray-300">Formula</div>
              <div className="font-mono text-gray-100">Production Time (hours) = Unit Cost (credits) / Production Capacity (cred/h)</div>
            </div>
          </div>

          {/* Research Capacity */}
          <div>
            <h4 className="text-base font-semibold text-white mb-1">Research Capacity</h4>
            <p className="text-gray-300 mb-2">
              Determines how quickly technologies can be researched at a base. Measured in cred/h.
            </p>
            <ul className="list-disc ml-5 text-gray-300 space-y-1">
              <li><span className="text-empire-gold">Baseline:</span> 0 cred/h.</li>
              <li><span className="text-empire-gold">Research Labs:</span> +8 per level.</li>
              <li><span className="text-empire-gold">Artificial Intelligence Technology:</span> +5% across all bases.</li>
              <li><span className="text-empire-gold">Research Commander:</span> reduces research time by 1% per commander level. (Hook)</li>
            </ul>
            <div className="mt-2 p-2 rounded bg-gray-800 border border-gray-700 text-gray-200">
              <div className="text-gray-300">Formula</div>
              <div className="font-mono text-gray-100">Research Time (hours) = Technology Cost (credits) / Research Capacity (cred/h)</div>
            </div>
          </div>

          {/* Examples */}
          <div>
            <h4 className="text-base font-semibold text-white mb-1">Example Calculations</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 rounded bg-gray-800 border border-gray-700">
                <div className="text-gray-300 font-semibold mb-1">Construction</div>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>Structure cost: 100 credits</li>
                  <li>Construction capacity: 20 cred/h</li>
                  <li>Time: <span className="font-mono text-white">100 / 20 = 5 hours</span></li>
                </ul>
              </div>
              <div className="p-3 rounded bg-gray-800 border border-gray-700">
                <div className="text-gray-300 font-semibold mb-1">Production</div>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>Unit cost: 50 credits</li>
                  <li>Production capacity: 10 cred/h</li>
                  <li>Time: <span className="font-mono text-white">50 / 10 = 5 hours</span></li>
                </ul>
              </div>
              <div className="p-3 rounded bg-gray-800 border border-gray-700">
                <div className="text-gray-300 font-semibold mb-1">Research</div>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>Technology cost: 80 credits</li>
                  <li>Research capacity: 40 cred/h</li>
                  <li>Time: <span className="font-mono text-white">80 / 40 = 2 hours</span></li>
                </ul>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Percent bonuses (e.g., Cybernetics, AI) apply to the total capacity after flat additions. Commander reductions apply to time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TerrainsSection: React.FC = () => {
  return (
    <div className="space-y-6">
      <TerrainsTable />
      <AstroPositionTable />
      <StarKindEffectsTable />
    </div>
  );
};

const TerrainsTable: React.FC = () => {
  const rows = useMemo(
    () =>
      Object.entries(TERRAIN_BASELINES)
        .filter(([name]) => name !== 'Asteroid')
        .map(([name, v]) => ({
          name,
          metal: v.metal ?? 0,
          gas: v.gas ?? 0,
          crystals: v.crystals ?? 0,
          fertility: v.fertility ?? 0,
          areaPlanet: v.areaPlanet ?? undefined,
          areaMoon: v.areaMoon ?? undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Terrains</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Terrain</th>
              <th className="py-2 px-3 text-left">Metal</th>
              <th className="py-2 px-3 text-left">Gas</th>
              <th className="py-2 px-3 text-left">Crystals</th>
              <th className="py-2 px-3 text-left">Fertility</th>
              <th className="py-2 px-3 text-left">Area Planet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-gray-800 hover:bg-gray-800/60">
                <td className="py-2 px-3 text-white">{r.name}</td>
                <td className="py-2 px-3 text-gray-200">{r.metal}</td>
                <td className="py-2 px-3 text-gray-200">{r.gas}</td>
                <td className="py-2 px-3 text-gray-200">{r.crystals}</td>
                <td className="py-2 px-3 text-gray-200">{r.fertility}</td>
                <td className="py-2 px-3 text-gray-200">{typeof r.areaPlanet === 'number' ? r.areaPlanet : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Values shown are baseline terrain attributes. Final planet yields and fertility also depend on orbit position and star kind modifiers.
      </p>
    </div>
  );
};

const AstroPositionTable: React.FC = () => {
  const positions = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const base = useMemo(
    () => positions.map((p) => ({ p, base: getBasePosition(p) })),
    [positions]
  );
  const gasByPos = useMemo(() => [0, 0, 0, 1, 1, 1, 2, 2], []);

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Astro Position Effects (Base)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Effect</th>
              {positions.map((p) => (
                <th key={p} className="py-2 px-3 text-center">P{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-800">
              <td className="py-2 px-3 text-white">Solar Energy</td>
              {base.map(({ p, base }) => (
                <td key={`se-${p}`} className="py-2 px-3 text-gray-200 text-center">{base.solarEnergy}</td>
              ))}
            </tr>
            <tr>
              <td className="py-2 px-3 text-white">Fertility</td>
              {base.map(({ p, base }) => (
                <td key={`fert-${p}`} className="py-2 px-3 text-gray-200 text-center">{base.fertility}</td>
              ))}
            </tr>
            <tr>
              <td className="py-2 px-3 text-white">Gas</td>
              {positions.map((p, idx) => (
                <td key={`gas-${p}`} className="py-2 px-3 text-gray-200 text-center">{gasByPos[idx]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Star kind can modify these base values further and can add or remove resource yields at certain positions.
      </p>
    </div>
  );
};

const StarKindEffectsTable: React.FC = () => {
  const kinds = useMemo<StarKind[]>(
    () => STAR_KIND_WEIGHTS.map(k => k.kind as StarKind),
    []
  );
  const [selected, setSelected] = useState<StarKind>(kinds[0] || 'YELLOW');
  const positions = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);

  const deltas = useMemo(
    () =>
      positions.map((p) => {
        const m = getStarKindModifiers(selected, p);
        return {
          p,
          solar: m.solarEnergyDelta,
          fert: m.fertilityDelta,
          metal: m.resourceDelta?.metal ?? 0,
          gas: m.resourceDelta?.gas ?? 0,
          crystals: m.resourceDelta?.crystals ?? 0,
        };
      }),
    [selected, positions]
  );

  return (
    <div className="game-card !bg-gray-900 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Star Kind Modifiers by Orbit Position</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Star Kind:</label>
          <select
            className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-md px-2 py-1"
            value={selected}
            onChange={(e) => setSelected(e.target.value as StarKind)}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Effect Δ</th>
              {positions.map((p) => (
                <th key={p} className="py-2 px-3 text-center">P{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-800">
              <td className="py-2 px-3 text-white">Solar Energy</td>
              {deltas.map((d) => (
                <td key={`s-${d.p}`} className="py-2 px-3 text-gray-200 text-center">{d.solar}</td>
              ))}
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 px-3 text-white">Fertility</td>
              {deltas.map((d) => (
                <td key={`f-${d.p}`} className="py-2 px-3 text-gray-200 text-center">{d.fert}</td>
              ))}
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 px-3 text-white">Metal</td>
              {deltas.map((d) => (
                <td key={`m-${d.p}`} className="py-2 px-3 text-gray-200 text-center">{d.metal}</td>
              ))}
            </tr>
            <tr className="border-b border-gray-800">
              <td className="py-2 px-3 text-white">Gas</td>
              {deltas.map((d) => (
                <td key={`g-${d.p}`} className="py-2 px-3 text-gray-200 text-center">{d.gas}</td>
              ))}
            </tr>
            <tr>
              <td className="py-2 px-3 text-white">Crystals</td>
              {deltas.map((d) => (
                <td key={`c-${d.p}`} className="py-2 px-3 text-gray-200 text-center">{d.crystals}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        This table shows how the selected star kind modifies the base orbit effects and terrain yields. Final planet values are:
        Terrain baseline + Star resource deltas + Base Orbit (Solar/Fertility) + Star Solar/Fertility deltas.
      </p>
    </div>
  );
};


const GameInfoModal: React.FC<GameInfoModalProps> = ({ initialTab }) => {
  const [active, setActive] = useState<InfoTab>(initialTab ?? 'technologies');

  return (
    <div className="space-y-4">
      <SectionHeaderStrip active={active} setActive={setActive} />

      {/* Content area with controlled height to keep within modal */}
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {active === 'technologies' && <TechnologiesTable />}
        {active === 'structures' && <StructuresTable />}
        {active === 'defenses' && <DefensesTable />}
        {active === 'units' && <UnitsTable />}
        {active === 'capacities' && <CapacitiesSection />}
        {active === 'terrains' && <TerrainsSection />}
        {active === 'all' && (
          <div className="space-y-6">
            <TechnologiesTable />
            <StructuresTable />
            <DefensesTable />
            <UnitsTable />
            <TerrainsSection />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInfoModal;
