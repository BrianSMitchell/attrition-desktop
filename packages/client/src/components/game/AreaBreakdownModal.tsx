import React from 'react';

type AreaUsageItem = {
  key: string;
  name: string;
  value: number; // absolute area used (units)
};

type AreaBreakdownData = {
  coord: string;
  totals: {
    used: number;
    free: number;
    total: number;
  };
  breakdown: {
    consumers: AreaUsageItem[];
  };
};

type Props = {
  data: AreaBreakdownData;
};

const fmt = (n: number) => n.toLocaleString();

const Row: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  if (!Number.isFinite(value) || value === 0) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-300">{label}</span>
      <span className="text-gray-200 font-mono">{fmt(value)}</span>
    </div>
  );
};

const Block: React.FC<{ title: string; children: React.ReactNode; total?: number; totalLabel?: string }> = ({
  title,
  children,
  total,
  totalLabel,
}) => {
  return (
    <div className="mb-4 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-white">{title}</h4>
        {Number.isFinite(total) && (
          <div className="text-sm text-gray-300">
            {totalLabel || 'Total'}: <span className="font-mono">{fmt(total as number)}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const AreaBreakdownModal: React.FC<Props> = ({ data }) => {
  if (!data) {
    return <div className="text-gray-400 text-sm">No area data available.</div>;
  }

  const { coord, totals, breakdown } = data;
  const usedSum = (breakdown.consumers || []).reduce((s, it) => s + (it.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">
        Base: <span className="text-white">{coord}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Used</div>
          <div className="mt-1 text-lg text-gray-200 font-mono">{fmt(totals.used)}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Free</div>
          <div className="mt-1 text-lg text-green-300 font-mono">{fmt(totals.free)}</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Total</div>
          <div className="mt-1 text-lg text-gray-200 font-mono">{fmt(totals.total)}</div>
        </div>
      </div>

      <Block title="Structures using area" total={usedSum} totalLabel="Used">
        {(breakdown.consumers || []).length === 0 && (
          <div className="text-sm text-gray-400">No structures currently using area.</div>
        )}
        {(breakdown.consumers || []).map((c) => (
          <Row key={`a-${c.key}`} label={c.name} value={c.value} />
        ))}
      </Block>

      <div className="text-xs text-gray-500">
        Notes:
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Totals are authoritative from the server Base Stats.</li>
          <li>Per-structure area usage uses catalog areaRequired × level when available.</li>
          <li>Some orbital structures may use 0 area.</li>
        </ul>
      </div>
    </div>
  );
};

export default AreaBreakdownModal;
