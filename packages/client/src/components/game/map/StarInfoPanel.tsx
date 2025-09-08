import React from 'react';

type StarOverhaulEffects = {
  kind: 'RED_GIANT' | 'SUPER_GIANT' | 'BLUE' | 'NEUTRON' | 'WHITE' | 'WHITE_DWARF' | 'ORANGE' | 'YELLOW';
  orbitModifiers?: Array<{
    position: number;
    solarEnergyDelta: number;
    fertilityDelta: number;
    resourceDelta: { metal: number; gas: number; crystals: number };
  }>;
  notes?: string;
};

interface StarInfoPanelProps {
  starType?: { color?: string; name?: string; class?: string };
  coord?: string;
  hasStar?: boolean; // false => explicitly no star (server confirmed)
  starOverhaul?: StarOverhaulEffects;
}

const fmtSigned = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const formatKind = (k: string) => k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const StarInfoPanel: React.FC<StarInfoPanelProps> = ({ starType, coord, hasStar, starOverhaul }) => {
  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="min-w-[240px] bg-gray-900/80 border border-gray-700 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        {!hasStar && hasStar !== undefined ? (
          <div className="text-gray-300">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-white">System Star</span>
            </div>
            <div className="text-red-300 text-sm">No star in this system</div>
            {coord && (
              <div className="text-xs text-gray-400 mt-1">({coord})</div>
            )}
          </div>
        ) : (
          <div className="text-gray-300">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-5 h-5 rounded-full border border-gray-600 shadow-inner"
                style={{ backgroundColor: starType?.color || '#ffffff' }}
                title="Star color"
              />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">
                  {starType ? `${starType.name} (${starType.class})` : 'Star'}
                </div>
                {coord && (
                  <div className="text-xs text-gray-400">({coord})</div>
                )}
              </div>
              {starOverhaul?.kind && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-200 text-[11px] border border-blue-500/40 whitespace-nowrap">
                  {formatKind(starOverhaul.kind)}
                </span>
              )}
            </div>

            <div className="mt-2 text-sm">
              <div className="text-gray-400 mb-1">Orbit Modifiers</div>
              {starOverhaul?.orbitModifiers && starOverhaul.orbitModifiers.length > 0 ? (
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {starOverhaul.orbitModifiers
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((m) => {
                      const parts: string[] = [];
                      if (m.solarEnergyDelta) parts.push(`Solar Energy ${fmtSigned(m.solarEnergyDelta)}`);
                      if (m.fertilityDelta) parts.push(`Fertility ${fmtSigned(m.fertilityDelta)}`);
                      if (m.resourceDelta) {
                        const metal = m.resourceDelta.metal ?? 0;
                        const gas = m.resourceDelta.gas ?? 0;
                        const crystals = m.resourceDelta.crystals ?? 0;
                        if (metal) parts.push(`Metal ${fmtSigned(metal)}`);
                        if (gas) parts.push(`Gas ${fmtSigned(gas)}`);
                        if (crystals) parts.push(`Crystals ${fmtSigned(crystals)}`);
                      }
                      const text = parts.length ? parts.join(' • ') : 'No changes';
                      return (
                        <div key={m.position} className="flex items-start gap-2">
                          <div className="text-gray-400 w-8">P{m.position}</div>
                          <div className="text-gray-200">{text}</div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-gray-400">No orbit modifiers available</div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default StarInfoPanel;
