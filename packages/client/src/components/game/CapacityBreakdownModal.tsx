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
  const fmtItem = (item: { source: string; value: number; kind: 'flat' | 'percent' }) => {
    if (item.kind === 'percent') {
      return `+${Math.round(item.value * 100)}%`;
    }
    return `+${Math.round(item.value).toLocaleString()} cred./h`;
  };

  const groups = classifyCapacityBreakdown(result.breakdown || []);

  const GroupBlock: React.FC<{ label: string; items: typeof result.breakdown }> = ({ label, items }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="space-y-1">
          {items.map((b, idx) => (
            <div key={`${label}-${idx}`} className="flex justify-between text-sm">
              <span className="text-gray-300">{b.source}</span>
              <span className="text-gray-200">{fmtItem(b as any)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mb-4 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-white">{title}</h4>
        <div className="text-sm text-gray-300">
          Total: <span className="font-mono">{fmtCred(result.value)}</span>
        </div>
      </div>

      <GroupBlock label="Baseline" items={groups.baseline} />
      <GroupBlock label="Buildings" items={groups.buildings} />
      <GroupBlock label="Location" items={groups.location} />
      <GroupBlock label="Tech" items={groups.tech} />
      <GroupBlock label="Commander" items={groups.commander} />
      <GroupBlock label="Other" items={groups.other} />
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

      <div className="text-xs text-gray-500">
        Notes:
        <ul className="list-disc ml-5 mt-1">
          <li>Percent bonuses are applied after summing all flat contributions.</li>
          <li>Cybernetics provides +5% to Construction and Production; Artificial Intelligence provides +5% to Research.</li>
          <li>Values are rounded for display.</li>
        </ul>
      </div>
    </div>
  );
};

export default CapacityBreakdownModal;
