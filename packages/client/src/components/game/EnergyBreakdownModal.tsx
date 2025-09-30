import React from 'react';

type ProducerConsumerItem = {
  key: string;
  name: string;
  value: number; // absolute contribution in energy units
};

type EnergyBreakdownData = {
  coord: string;
  totals: {
    produced: number;
    consumed: number;
    balance: number;
    reservedNegative?: number; // optional future use
  };
  breakdown: {
    baseline: number;
    solar?: number;
    gas?: number;
    producers: ProducerConsumerItem[];
    consumers: ProducerConsumerItem[];
    reserved?: ProducerConsumerItem[]; // optional future use
  };
};

type Props = {
  data: EnergyBreakdownData;
};

const fmtEnergy = (n: number) => n.toLocaleString();

const SectionRow: React.FC<{ label: string; value: number; negative?: boolean }> = ({
  label,
  value,
  negative,
}) => {
  if (!Number.isFinite(value) || value === 0) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-300">{label}</span>
      <span className={negative ? 'text-red-300 font-mono' : 'text-gray-200 font-mono'}>
        {negative ? '-' : '+'}
        {fmtEnergy(Math.abs(value))}
      </span>
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
            {totalLabel || 'Total'}:{' '}
            <span className="font-mono">{fmtEnergy(total as number)}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
};

const EnergyBreakdownModal: React.FC<Props> = ({ data }) => {
  if (!data) {
    return <div className="text-gray-400 text-sm">No energy data available.</div>;
  }

  const { coord, totals, breakdown } = data;

  const producersSum =
    (breakdown.baseline || 0) +
    (breakdown.solar || 0) +
    (breakdown.gas || 0) +
    (breakdown.producers || []).reduce((s, it) => s + (it.value || 0), 0);

  const consumersSum = (breakdown.consumers || []).reduce((s, it) => s + (it.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">
        Base: <span className="text-white">{coord}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Produced</div>
          <div className="mt-1 text-lg text-green-300 font-mono">
            +{fmtEnergy(totals.produced)}
          </div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Consumed</div>
          <div className="mt-1 text-lg text-red-300 font-mono">
            -{fmtEnergy(totals.consumed)}
          </div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
          <div className="text-xs text-gray-400">Balance</div>
          <div className={`mt-1 text-lg font-mono ${totals.balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {fmtEnergy(totals.balance)}
          </div>
        </div>
      </div>

      <Block title="Produced" total={producersSum} totalLabel="Produced">
        <div className="space-y-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Baseline & Context</div>
          <SectionRow label="Baseline" value={breakdown.baseline || 0} />
          <SectionRow label="Solar Plants × solarEnergy" value={breakdown.solar || 0} />
          <SectionRow label="Gas Plants × gasYield" value={breakdown.gas || 0} />
        </div>

        {(breakdown.producers || []).length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Other Producers</div>
            {(breakdown.producers || []).map((p) => (
              <SectionRow key={`p-${p.key}`} label={p.name} value={p.value} />
            ))}
          </div>
        )}
      </Block>

      <Block title="Consumed" total={consumersSum} totalLabel="Consumed">
        {(breakdown.consumers || []).length === 0 && (
          <div className="text-sm text-gray-400">No energy consumption from structures.</div>
        )}
        {(breakdown.consumers || []).map((c) => (
          <SectionRow key={`c-${c.key}`} label={c.name} value={-Math.abs(c.value)} negative />
        ))}
      </Block>

      {(typeof totals.reservedNegative === 'number' && totals.reservedNegative !== 0) || (breakdown.reserved && breakdown.reserved.length > 0) ? (
        <Block title="Reserved (Under Construction)" total={totals.reservedNegative} totalLabel="Reserved">
          {(breakdown.reserved || []).map((r) => (
            <div key={`r-${r.key}`} className="flex justify-between text-sm">
              <span className="text-gray-300">
                {r.name}
                <span className="text-xs text-gray-500 ml-2">(-{Math.abs(r.value)} energy)</span>
              </span>
              <span className="text-yellow-300 font-mono">{fmtEnergy(Math.abs(r.value))}</span>
            </div>
          ))}
          {breakdown.reserved && breakdown.reserved.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              These structures are currently under construction and will consume energy when completed.
            </div>
          )}
          {(!breakdown.reserved || breakdown.reserved.length === 0) && totals.reservedNegative !== 0 && (
            <div className="text-sm text-gray-400">
              Total energy reserved: <span className="font-mono text-yellow-300">{fmtEnergy(Math.abs(totals.reservedNegative || 0))}</span>
            </div>
          )}
        </Block>
      ) : null}

      <div className="text-xs text-gray-500">
        Notes:
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Every base starts with +2 baseline energy</li>
          <li>Solar plants produce: level × planet's solar energy value</li>
          <li>Gas plants produce: level × planet's gas yield value</li>
          <li>Other structures consume or produce fixed energy per level</li>
          <li>Reserved energy shows structures under construction that will consume energy</li>
        </ul>
      </div>
    </div>
  );
};

export default EnergyBreakdownModal;
