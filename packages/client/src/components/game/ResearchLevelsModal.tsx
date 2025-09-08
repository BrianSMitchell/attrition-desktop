import React from 'react';
import type { TechnologyKey } from '@game/shared';
import { RESEARCH_LEVEL_TABLES, RESEARCH_LEVEL_META } from './levelTables/research';
import { METRIC_LABELS, METRIC_KIND, type MetricKey, selectVisibleMetricKey, computeHasCreditsOnly } from './levelTables/research/metrics';

interface ResearchLevelsModalProps {
  techKey: TechnologyKey | undefined;
}





const ResearchLevelsModal: React.FC<ResearchLevelsModalProps> = ({ techKey }) => {
  if (!techKey) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No technology selected.</p>
      </div>
    );
  }

  const rows = RESEARCH_LEVEL_TABLES[techKey] || [];
  const meta = RESEARCH_LEVEL_META[techKey];

  // Determine which metric column (if any) should be shown
  const visibleMetricKey: MetricKey | undefined = selectVisibleMetricKey(rows);

  const hasCreditsOnly = computeHasCreditsOnly(rows, visibleMetricKey);

  const showLabsBlock = !visibleMetricKey && !hasCreditsOnly;

  // Compute empty-state colSpan based on derived columns
  const emptyStateColSpan = hasCreditsOnly ? 2 : visibleMetricKey ? 3 : 5;

  return (
    <div className="space-y-3">
      {meta?.subtitle && <div className="text-sm text-gray-300">{meta.subtitle}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr className="text-gray-300 border-b border-gray-700">
              <th className="py-2 px-3 text-left">Level</th>
              <th className="py-2 px-3 text-left">Credits</th>
              {visibleMetricKey ? (
                <th className="py-2 px-3 text-left">{METRIC_LABELS[visibleMetricKey]}</th>
              ) : showLabsBlock ? (
                <>
                  <th className="py-2 px-3 text-left">Labs</th>
                  <th className="py-2 px-3 text-left">Requires</th>
                  <th className="py-2 px-3 text-left">Effect</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={emptyStateColSpan} className="py-2 px-3 text-gray-400">
                  Coming soon.
                </td>
              </tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.level} className="border-b border-gray-800">
                  <td className="py-2 px-3 text-gray-200">{r.level}</td>
                  <td className="py-2 px-3 text-gray-200">
                    {typeof r.credits === 'number' ? r.credits.toLocaleString() : '—'}
                  </td>

                  {visibleMetricKey ? (
                    <td className="py-2 px-3 text-gray-200">
                      {typeof r[visibleMetricKey] === 'number'
                        ? METRIC_KIND[visibleMetricKey] === 'percent'
                          ? `${r[visibleMetricKey]}%`
                          : (r[visibleMetricKey] as number).toLocaleString()
                        : '—'}
                    </td>
                  ) : showLabsBlock ? (
                    <>
                      <td className="py-2 px-3 text-gray-200">
                        {typeof r.labs === 'number' ? r.labs.toLocaleString() : '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-200">{r.requires ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-200">{r.effect ?? '—'}</td>
                    </>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResearchLevelsModal;
