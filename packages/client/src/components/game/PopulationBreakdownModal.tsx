import React from 'react';

type PopItem = {
  key: string;
  name: string;
  value: number; // absolute population units (people)
};

type PopulationBreakdownData = {
  coord: string;
  totals: {
    used: number;
    capacity: number;
    free: number;
  };
  breakdown: {
    users?: PopItem[];    // populationRequired × level per structure (consumption)
    sources?: PopItem[];  // capacity-providing sources (if available in catalog)
  };
};

type Props = {
  data: PopulationBreakdownData;
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
  totalLabel
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

const PopulationBreakdownModal: React.FC<Props> = ({ data }) => {
  if (!data) {
    return <div className="text-gray-400 text-sm">No population data available.</div>;
  }

  const { coord, totals, breakdown } = data;

  const users = breakdown.users || [];
  const sources = breakdown.sources || [];

  const usersSum = users.reduce((s, it) => s + (it.value || 0), 0);
  const sourcesSum = sources.reduce((s, it) => s + (it.value || 0), 0);

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
          <div className="text-xs text-gray-400">Capacity</div>
          <div className="mt-1 text-lg text-gray-200 font-mono">{fmt(totals.capacity)}</div>
        </div>
      </div>

      <Block title="Users (population required by structures)" total={usersSum} totalLabel="Used">
        {users.length === 0 && (
          <div className="text-sm text-gray-400">No structures currently consuming population.</div>
        )}
        {users.map((u) => (
          <Row key={`u-${u.key}`} label={u.name} value={u.value} />
        ))}
      </Block>

      <Block title="Capacity Sources" total={sourcesSum} totalLabel="Capacity">
        {sources.length === 0 ? (
          <div className="text-sm text-gray-400">
            No per-building capacity sources are defined. Showing totals only.
          </div>
        ) : (
          sources.map((s) => <Row key={`s-${s.key}`} label={s.name} value={s.value} />)
        )}
      </Block>

      <div className="text-xs text-gray-500">
        Notes:
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Totals (Used/Free/Capacity) are authoritative from the server Base Stats.</li>
          <li>Users are computed from catalog populationRequired × current level per structure.</li>
          <li>If capacity-providing fields are added to the catalog, they will appear under Capacity Sources.</li>
        </ul>
      </div>
    </div>
  );
};

export default PopulationBreakdownModal;
