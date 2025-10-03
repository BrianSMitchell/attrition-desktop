/**
 * Enhanced BaseDetail component
 * Uses the unified enhanced store system - no legacy services
 */

import React, { useEffect, useState } from 'react';
import { useGame, useGameActions, useUIActions } from '../../../stores/enhancedAppStore';
import { gameApi } from '../../../stores/services/gameApi';
import type { TechnologyKey, DefenseKey, StructureKey as BuildingKey } from '@game/shared';

// Sub-components
import { BaseDetailHeader } from './BaseDetailHeader';
import { BaseDetailTabs, type BaseDetailPanel } from './BaseDetailTabs';
import { BaseDetailNotice, type Notice } from './BaseDetailNotice';
import { OverviewPanel } from './panels/OverviewPanel';
import { FleetPanel } from './panels/FleetPanel';
import { ResearchPanel } from './panels/ResearchPanel';
import { DefensePanel } from './panels/DefensePanel';
import { StructuresPanel } from './panels/StructuresPanel';

interface BaseDetailProps {
  base: any;
  onBack: () => void;
  initialActivePanel?: BaseDetailPanel;
  onPanelChange?: (panel: BaseDetailPanel) => void;
  // Overview data passed from parent (owner BasePage)
  fleets?: Array<{ _id: string; name: string; ownerName: string; arrival: string | null; sizeCredits: number }>;
  fleetsError?: string | null;
  fleetsLoading?: boolean;
  buildings: any[];
  defenses: any[];
  buildingsError?: string | null;
  onRefreshBuildings?: () => void;
  onRefreshFleets?: () => void;
}

export const BaseDetail: React.FC<BaseDetailProps> = ({ 
  base, 
  onBack, 
  initialActivePanel, 
  onPanelChange,
  fleets,
  fleetsError,
  fleetsLoading,
  buildings,
  defenses,
  buildingsError,
  onRefreshBuildings,
  onRefreshFleets
}) => {
  const [activePanel, setActivePanel] = useState<BaseDetailPanel>(initialActivePanel ?? 'overview');
  const [notice, setNotice] = useState<Notice | null>(null);
  
  // Enhanced store data and actions
  const gameState = useGame();
  const gameActions = useGameActions();
  const { addToast } = useUIActions();
  
  // Panel change handler
  const handlePanelChange = (panel: BaseDetailPanel) => {
    setActivePanel(panel);
    onPanelChange?.(panel);
  };

  // Notice helper
  const showNotice = (msg: string, type: Notice['type'] = 'info') => {
    setNotice({ message: msg, type });
    window.setTimeout(() => setNotice(null), 5000);
  };

  // Sync with initialActivePanel prop
  useEffect(() => {
    if (initialActivePanel && initialActivePanel !== activePanel) {
      setActivePanel(initialActivePanel);
    }
  }, [initialActivePanel]);

  // Load base stats when base changes
  useEffect(() => {
    if (base?.locationCoord) {
      gameActions.loadBaseStats(base.locationCoord);
    }
  }, [base?.locationCoord]); // gameActions is stable from Zustand, no need to include

  // Load data when panel becomes active
  useEffect(() => {
    if (!base?.locationCoord) return;

    switch (activePanel) {
      case 'research':
        gameActions.loadResearchData(base.locationCoord);
        gameActions.loadResearchQueue(base.locationCoord);
        break;
      case 'defense':
        gameActions.loadDefenseData(base.locationCoord);
        break;
      case 'structures':
        gameActions.loadStructuresData(base.locationCoord);
        break;
      case 'overview':
        // Overview needs current structures and defense levels to populate its tables
        // Load both so the fallback store-backed rendering has data even if props are empty
        gameActions.loadStructuresData(base.locationCoord);
        gameActions.loadDefenseData(base.locationCoord);
        break;
      case 'fleet':
        // Fleet panel: load units catalog, status, and production queue
        gameActions.loadUnitsData(base.locationCoord);
        gameActions.loadUnitsQueue(base.locationCoord);
        break;
    }
  }, [activePanel, base?.locationCoord]); // gameActions is stable from Zustand, no need to include

  // Auto-refresh Units requirements when tech levels or shipyard levels change
  // This keeps the Production page's "Requires" section in sync after completing research
  // or building shipyards without forcing the user to click Refresh.
  useEffect(() => {
    if (activePanel !== 'fleet') return; // only refresh while on the Production tab
    if (!base?.locationCoord) return;

    // Trigger a refresh of Units status when prerequisites change.
    // We compute fingerprints in the dependency array below and just invoke the loader here.
    Promise.resolve().then(() => {
      gameActions.loadUnitsData(base.locationCoord);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord, JSON.stringify(gameState?.research?.status?.techLevels || {}), gameState?.structures?.status?.currentLevels?.['shipyards'], gameState?.structures?.status?.currentLevels?.['orbital_shipyards']]);

  // Auto-refresh Research requirements when research lab levels change
  // Keeps the "Requires N lab levels at this base (have Y)" and Labs count in sync
  useEffect(() => {
    if (activePanel !== 'research') return; // only while on Research tab
    if (!base?.locationCoord) return;

    Promise.resolve().then(() => {
      gameActions.loadResearchData(base.locationCoord);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel, base?.locationCoord, gameState?.structures?.status?.currentLevels?.['research_labs']]);

  // Compute fallback overview data from enhanced store when props are empty
  const computeFallbackBuildings = React.useCallback(() => {
    const out: any[] = [];
    const catalog = gameState?.structures?.catalog || [];
    const levels = gameState?.structures?.status?.currentLevels || {};
    for (const spec of catalog as any[]) {
      const key = (spec as any).key;
      const level = Number((levels as any)[key] || 0);
      out.push({
        _id: `${base?.locationCoord || 'base'}-${key}`,
        displayName: (spec as any).name,
        catalogKey: key,
        level,
        isActive: true,
        locationCoord: base?.locationCoord,
      });
    }
    return out;
  }, [gameState?.structures?.catalog, gameState?.structures?.status?.currentLevels, base?.locationCoord]);

  const computeFallbackDefenses = React.useCallback(() => {
    const out: Array<{ key: string; name: string; level: number; energyDelta: number }> = [];
    const catalog = (gameState?.defense?.catalog || []) as any[];
    const levels = (gameState?.defense?.status as any)?.currentLevels || {};
    for (const spec of catalog) {
      const key = (spec as any).key as string;
      const level = Number(levels[key] || 0);
      const energyDelta = Number((spec as any).energyDelta || 0);
      out.push({ key, name: (spec as any).name, level, energyDelta });
    }
    return out;
  }, [gameState?.defense?.catalog, gameState?.defense?.status]);

  const effectiveBuildings = (buildings && buildings.length > 0) ? buildings : computeFallbackBuildings();
  const effectiveDefenses = (defenses && defenses.length > 0) ? defenses : computeFallbackDefenses();

  // Header refresh - reload base stats
  const refreshHeaderBudgets = async () => {
    if (base?.locationCoord) {
      await gameActions.loadBaseStats(base.locationCoord);
    }
  };

  return (
    <div className="space-y-6">
      <BaseDetailHeader
        base={base}
        baseStats={gameState?.baseStats || null}
        onBack={onBack}
        onRefresh={refreshHeaderBudgets}
      />
      
      <BaseDetailTabs
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />
      
      <BaseDetailNotice notice={notice} />

      {/* Panel Content - Enhanced store integration */}
      {activePanel === 'overview' && (
        <OverviewPanel
          base={base}
          refreshKey={0}
          fleets={Array.isArray(fleets) ? fleets : []}
          fleetsLoading={!!fleetsLoading}
          fleetsError={fleetsError ?? null}
          buildings={effectiveBuildings}
          buildingsLoading={false}
          buildingsError={buildingsError ?? null}
          defenseLevels={effectiveDefenses}
          onRefreshFleets={onRefreshFleets || (() => { if (base?.locationCoord) { /* optional owner fleets refresh */ } })}
          onRefreshBuildings={onRefreshBuildings || (async () => {
            if (!base?.locationCoord) return;
            // Use enhanced store loaders as a reliable source of truth
            await Promise.all([
              gameActions.loadStructuresData(base.locationCoord),
              gameActions.loadDefenseData(base.locationCoord),
            ]);
          })}
        />
      )}

      {activePanel === 'fleet' && (
        <FleetPanel
          unitsError={gameState?.units?.error || null}
          productionQueue={gameState?.units?.queue || []}
          unitsCatalog={gameState?.units?.catalog || []}
          capacities={{ production: { value: gameState?.units?.productionPerHour || 0 } }}
          unitsStatus={gameState?.units?.status || null}
          unitsLoading={gameState?.loading?.units || false}
          baseCoord={base.locationCoord}
          onRefreshProductionQueue={() => {
            gameActions.loadUnitsQueue(base.locationCoord);
          }}
          onCancelProduction={async (itemId: string) => {
            try {
              const result = await gameApi.cancelUnitProduction(itemId);
              if (result.success) {
                addToast({ type: 'success', message: 'Production cancelled successfully' });
                // Refresh data
                gameActions.loadUnitsQueue(base.locationCoord);
                await refreshHeaderBudgets();
              } else {
                addToast({ type: 'error', message: result.error || 'Failed to cancel production' });
              }
            } catch (error) {
              console.error('Error cancelling production:', error);
              addToast({ type: 'error', message: 'Network error cancelling production' });
            }
          }}
          onRefreshUnitsData={() => {
            gameActions.loadUnitsData(base.locationCoord);
            gameActions.loadUnitsQueue(base.locationCoord);
          }}
          onSubmitProduction={async (items: any[], _totals: any) => {
            try {
              let successCount = 0;
              let errorCount = 0;
              
              for (const item of items) {
                if (item.quantity > 0) {
                  for (let i = 0; i < item.quantity; i++) {
                    // Use existing startUnit API method
                    const result = await gameApi.startUnit(base.locationCoord, item.unitKey);
                    if (result.success) {
                      successCount++;
                    } else {
                      errorCount++;
                      // Show first error
                      if (errorCount === 1) {
                        const errorMsg = result.reasons && result.reasons.length > 0 
                          ? result.reasons.join('; ') 
                          : result.error || 'Failed to start production';
                        addToast({ type: 'error', message: errorMsg });
                      }
                    }
                  }
                }
              }
              
              if (successCount > 0) {
                addToast({ type: 'success', message: `Started production for ${successCount} unit(s)` });
                // Refresh data
                gameActions.loadUnitsData(base.locationCoord);
                gameActions.loadUnitsQueue(base.locationCoord);
                await refreshHeaderBudgets();
              }
            } catch (error) {
              console.error('Error starting production:', error);
              addToast({ type: 'error', message: 'Network error starting production' });
            }
          }}
        />
      )}

      {activePanel === 'research' && (
        <ResearchPanel
          baseCoord={base.locationCoord}
          catalog={gameState?.research?.catalog || []}
          status={gameState?.research?.status || null}
          researchLoading={gameState?.loading?.research || false}
          researchError={gameState?.research?.error || null}
          activeResearch={gameState?.research?.activeResearch || null}
          researchPerHour={gameState?.research?.researchPerHour}
          onRefresh={() => {
            gameActions.loadResearchData(base.locationCoord);
            gameActions.loadResearchQueue(base.locationCoord);
          }}
          onStart={async (techKey: TechnologyKey) => {
            try {
              const result = await gameApi.startResearch(base.locationCoord, techKey);
              if (result.success) {
                addToast({ type: 'success', message: 'Research started successfully' });
                // Refresh data
                gameActions.loadResearchData(base.locationCoord);
                gameActions.loadResearchQueue(base.locationCoord);
              } else {
                const errorMsg = result.reasons && result.reasons.length > 0 
                  ? result.reasons.join('; ') 
                  : result.error || 'Failed to start research';
                addToast({ type: 'error', message: errorMsg });
              }
            } catch (error) {
              console.error('Error starting research:', error);
              addToast({ type: 'error', message: 'Network error starting research' });
            }
          }}
          onQueueChanged={async () => {
            await refreshHeaderBudgets();
            gameActions.loadResearchQueue(base.locationCoord);
          }}
        />
      )}

      {activePanel === 'defense' && (
        <DefensePanel
          baseCoord={base.locationCoord}
          defensesCatalog={gameState?.defense?.catalog || []}
          defenseQueue={gameState?.defense?.queue || []}
          defensesStatus={gameState?.defense?.status || null}
          defensesLoading={gameState?.loading?.defense || false}
          defensesError={gameState?.defense?.error || null}
          activeConstruction={gameState?.defense?.activeConstruction || null}
          citizenPerHour={gameState?.defense?.citizenPerHour}
          onRefresh={() => {
            gameActions.loadDefenseData(base.locationCoord);
          }}
          onStart={async (defenseKey: DefenseKey) => {
            try {
              const result = await gameApi.startDefense(base.locationCoord, defenseKey);
              if (result.success) {
                addToast({ type: 'success', message: 'Defense construction started successfully' });
                // Refresh data
                gameActions.loadDefenseData(base.locationCoord);
              } else {
                const errorMsg = result.reasons && result.reasons.length > 0 
                  ? result.reasons.join('; ') 
                  : result.error || 'Failed to start defense construction';
                addToast({ type: 'error', message: errorMsg });
              }
            } catch (error) {
              console.error('Error starting defense:', error);
              addToast({ type: 'error', message: 'Network error starting defense' });
            }
          }}
        />
      )}

      {activePanel === 'structures' && (
        <StructuresPanel
          baseCoord={base.locationCoord}
          structuresCatalog={gameState?.structures?.catalog || []}
          structuresStatus={gameState?.structures?.status || null}
          structuresLoading={gameState?.loading?.structures || false}
          structuresError={gameState?.structures?.error || null}
          activeConstruction={gameState?.structures?.activeConstruction || null}
          constructionPerHour={gameState?.structures?.constructionPerHour}
          planetGasYield={gameState?.structures?.planetYields?.gasYield}
          planetMetalYield={gameState?.structures?.planetYields?.metalYield}
          planetCrystalsYield={gameState?.structures?.planetYields?.crystalsYield}
          planetSolarEnergy={gameState?.structures?.planetYields?.solarEnergy}
          planetFertility={gameState?.structures?.planetYields?.fertility}
          techLevels={gameState?.research?.status?.techLevels || {}}
          onRefresh={() => {
            gameActions.loadStructuresData(base.locationCoord);
          }}
          onStart={async (structureKey: BuildingKey) => {
            try {
              const result = await gameApi.startStructure(base.locationCoord, structureKey);
              if (result.success) {
                addToast({ type: 'success', message: 'Structure construction started successfully' });
                // Refresh data
                gameActions.loadStructuresData(base.locationCoord);
              } else {
                addToast({ type: 'error', message: result.error || 'Failed to start structure construction' });
              }
            } catch (error) {
              console.error('Error starting structure:', error);
              addToast({ type: 'error', message: 'Network error starting structure construction' });
            }
          }}
          onQueue={async (_structureKey: BuildingKey) => {
            // For offline queueing - implement if needed
            showNotice('Offline queueing not yet implemented for structures', 'info');
            return { success: false };
          }}
        />
      )}

      {activePanel === 'trade' && (
        <div className="game-card">
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-semibold mb-2">Trade System Coming Soon</h3>
            <p className="text-sm">
              The trade system is currently under development. 
              You'll be able to buy and sell resources, negotiate with other players, 
              and access interstellar markets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseDetail;