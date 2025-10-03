import React, { useEffect, useState } from 'react';
import { getCreditHistory } from '../../services/api';

interface Row {
  _id: string;
  amount: number;
  type: string;
  note: string | null;
  balanceAfter: number | null;
  createdAt: string;
}

const amountClass = (n: number) => (n >= 0 ? 'text-green-400' : 'text-red-400');

const CreditHistoryModal: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getCreditHistory(100);
        if (!cancelled) setRows(res.history || []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-2">
      <h2 className="text-lg font-semibold mb-2">Credits History</h2>
      {loading && <div className="text-gray-400">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="max-h-96 overflow-auto border border-gray-700 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Note</th>
                <th className="text-right px-3 py-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-6">No transactions yet.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id} className="odd:bg-gray-900">
                  <td className="px-3 py-2 text-gray-300">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-mono ${amountClass(r.amount)}`}>{r.amount >= 0 ? '+' : ''}{r.amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-300">{r.type}</td>
                  <td className="px-3 py-2 text-gray-400">{r.note || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-300">{typeof r.balanceAfter === 'number' ? r.balanceAfter.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreditHistoryModal;