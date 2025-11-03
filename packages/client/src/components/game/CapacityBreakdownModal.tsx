import React from 'react';
import type { CapacityResult } from '@game/shared';
import { classifyCapacityBreakdown } from '@game/shared';

type Props = {
  data: {
    coord: string;
    capacities: {
      construction: CapacityResult;
      production: CapacityResult;
      research: CapacityResult;
    };
  };
};

const Section: React.FC<{ title: string; result: CapacityResult }> = ({ title, result }) => {
  const fmtCred = (n: number) => `${Math.round(n).toLocaleString()} cred./h`;
  const fmtItem = (item: { source: string; value: number; kind: 'flat' | 'percent' }, flatSubtotal?: number) => {
    if (item.kind === 'percent') {
      const creditsValue = flatSubtotal ? flatSubtotal * item.value : 0;
      return (
        <span>
          <span className="text-amber-400">+{Math.round(item.value * 100)}%</span>
          {flatSubtotal && creditsValue > 0 && (
            <span className="text-gray-500 text-xs ml-1">
              ({Math.round(creditsValue) > 0 ? '+' : ''}{Math.round(creditsValue)} cred./h)
            </span>
          )}
        </span>
      );
    }
    return `+${Math.round(item.value).toLocaleString()} cred./h`;
  };

  const groups = classifyCapacityBreakdown(result.breakdown || []);
  
  // Calculate flat subtotal (sum of all non-percent items)
  const flatItems = [
    ...groups.baseline,
    ...groups.buildings,
    ...groups.location,
  ];
  const flatSubtotal = flatItems.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Calculate total percentage modifier
  const percentItems = [
    ...groups.tech,
    ...groups.commander,
    ...groups.citizen,
  ];
  const totalPercent = percentItems.reduce((sum, item) => sum + (item.value || 0), 0);

  const GroupBlock: React.FC<{ label: string; items: typeof result.breakdown; showPercent?: boolean }> = ({ label, items, showPercent }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="space-y-1">
          {items.map((b, idx) => (
            <div key={`${label}-${idx}`} className="flex justify-between text-sm">
              <span className="text-gray-300">{b.source}</span>
              <span className="text-gray-200">{fmtItem(b as any, showPercent ? flatSubtotal : undefined)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasPercentBonuses = percentItems.length > 0;

  return (
    <div className="mb-4 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-white">{title}</h4>
        <div className="text-sm text-gray-300">
          Total: <span className="font-mono font-bold text-green-400">{fmtCred(result.value)}</span>
        </div>
      </div>

      {/* Flat Bonuses Section */}
      <div className="mb-3">
        <div className="text-xs text-blue-400 uppercase tracking-wide mb-2 font-semibold">Flat Bonuses</div>
        <div className="ml-2">
          <GroupBlock label="" items={groups.baseline} />
          <GroupBlock label="" items={groups.buildings} />
          <GroupBlock label="" items={groups.location} />
          <GroupBlock label="" items={groups.other} />
        </div>
        
        {/* Flat Subtotal */}
        {hasPercentBonuses && flatSubtotal > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between text-sm font-semibold">
            <span className="text-blue-300">Flat Subtotal:</span>
            <span className="text-blue-300 font-mono">{fmtCred(flatSubtotal)}</span>
          </div>
        )}
      </div>

      {/* Percentage Modifiers Section */}
      {hasPercentBonuses && (
        <div className="mb-2">
          <div className="text-xs text-amber-400 uppercase tracking-wide mb-2 font-semibold">Percentage Modifiers</div>
          <div className="ml-2">
            <GroupBlock label="" items={groups.tech} showPercent />
            <GroupBlock label="" items={groups.commander} showPercent />
            <GroupBlock label="" items={groups.citizen} showPercent />
          </div>
          
          {/* Show total multiplier */}
          {totalPercent > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between text-xs">
              <span className="text-amber-300">Total Multiplier:</span>
              <span className="text-amber-300 font-mono">×{(1 + totalPercent).toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Final Calculation */}
      {hasPercentBonuses && flatSubtotal > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-500 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Calculation:</span>
            <span className="font-mono">
              {Math.round(flatSubtotal)} × {(1 + totalPercent).toFixed(2)} = {Math.round(result.value)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const CapacityBreakdownModal: React.FC<Props> = ({ data }) => {
  if (!data?.capacities) {
    return <div className="text-gray-400 text-sm">No capacity data available.</div>;
  }

  const { coord, capacities } = data;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">Base: <span className="text-white">{coord}</span></div>

      <Section title="Construction Capacity" result={capacities.construction} />
      <Section title="Production Capacity" result={capacities.production} />
      <Section title="Research Capacity" result={capacities.research} />
      {('citizen' in capacities) && (
        <Section title="Citizen Capacity" result={(capacities as any).citizen} />
      )}

      <div className="text-xs text-gray-500 bg-gray-800 bg-opacity-50 p-3 rounded">
        <div className="font-semibold text-gray-400 mb-1">How Capacities Are Calculated:</div>
        <ol className="list-decimal ml-5 mt-1 space-y-1">
          <li><span className="text-blue-400 font-semibold">Flat bonuses</span> are added together (baseline + buildings + location)</li>
          <li><span className="text-amber-400 font-semibold">Percentage modifiers</span> are then applied to the flat subtotal</li>
          <li><span className="text-green-400 font-semibold">Final total</span> = Flat Subtotal × (1 + Total Percentage)</li>
        </ol>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="font-semibold text-gray-400 mb-1">Bonus Sources:</div>
          <ul className="list-disc ml-5 space-y-0.5">
            <li><strong>Citizens:</strong> +1% per 1,000 citizens</li>
            <li><strong>Cybernetics tech:</strong> +5% to Construction & Production</li>
            <li><strong>Artificial Intelligence tech:</strong> +5% to Research</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CapacityBreakdownModal;
