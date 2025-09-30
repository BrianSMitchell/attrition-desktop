/**
 * Base detail tabs component
 * Navigation tabs for different base panels
 */

import React from 'react';

export type BaseDetailPanel = 'overview' | 'fleet' | 'defense' | 'research' | 'structures' | 'trade';

export interface BaseDetailTabsProps {
  /** Current active panel */
  activePanel: BaseDetailPanel;
  /** Panel change handler */
  onPanelChange: (panel: BaseDetailPanel) => void;
}

interface TabConfig {
  key: BaseDetailPanel;
  label: string;
  icon: string;
  testId: string;
}

const TABS: TabConfig[] = [
  { key: 'overview', label: 'Overview', icon: '📋', testId: 'tab-overview' },
  { key: 'fleet', label: 'Production', icon: '🚀', testId: 'tab-fleet' },
  { key: 'defense', label: 'Defense', icon: '🛡️', testId: 'tab-defense' },
  { key: 'research', label: 'Research', icon: '🔬', testId: 'tab-research' },
  { key: 'structures', label: 'Structures', icon: '🏗️', testId: 'tab-structures' },
  { key: 'trade', label: 'Trade', icon: '💱', testId: 'tab-trade' },
];

export const BaseDetailTabs: React.FC<BaseDetailTabsProps> = ({
  activePanel,
  onPanelChange
}) => {
  return (
    <div className="game-card">
      <div className="flex border-b border-gray-600">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-testid={tab.testId}
            onClick={() => onPanelChange(tab.key)}
            className={`px-4 py-2 font-medium transition-colors ${
              activePanel === tab.key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};