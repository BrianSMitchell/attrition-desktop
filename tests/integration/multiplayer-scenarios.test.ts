/**

import { DB_FIELDS } from '../packages/server/src/constants/database-fields';
/**
 * Multiplayer Scenario Tests for Attrition MMO
 * 
 * This test suite demonstrates and validates the multiplayer testing framework
 * with comprehensive scenarios covering player interactions, synchronization,
 * conflict resolution, and networked game state consistency.
 */

import { 
  MultiplayerTestingEngine, 
  MultiplayerScenarioConfig, 
  PlayerInteraction,
  MultiplayerTestResult,
  createMultiplayerConfig,
  MultiplayerAssertions 
} from './multiplayer-testing-framework';
import { GameAssertion } from './game-simulation-framework';
import { connectToTestDatabase, disconnectFromTestDatabase } from '../test-setup';

describe('Multiplayer Scenario Testing', () => {
  beforeAll(async () => {
    await connectToTestDatabase();
  });

  afterAll(async () => {
    await disconnectFromTestDatabase();
  });

  describe('Basic Multiplayer Interactions', () => {
    test('should handle simple player-to-player trade', async () => {
      const config = createMultiplayerConfig({
        playerCount: 2,
        startingResources: {
          credits: 5000,
          energy: 3000,
          metal: 1000,
          research: 500
        },
        networkSettings: {
          latencyMs: 50,
          packetLoss: 0,
          jitter: 10,
          enableDesync: false
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const tradeInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            resourceType: 'metal',
            quantity: 200,
            pricePerUnit: 5
          }
        }
      ];

      const assertions: GameAssertion[] = [
        {
          type: 'resource',
          empireId: 'player-1',
          condition: (state) => state.resources.metal === 800 && state.resources.credits === 6000,
          description: 'Player 1 should have traded metal for credits',
          required: true
        },
        {
          type: 'resource',
          empireId: 'player-2',
          condition: (state) => state.resources.metal === 1200 && state.resources.credits === 4000,
          description: 'Player 2 should have gained metal and spent credits',
          required: true
        },
        MultiplayerAssertions.noNegativeResources(),
        MultiplayerAssertions.territoryIntegrity()
      ];

      const result = await engine.runMultiplayerScenario(
        'simple-trade',
        tradeInteractions,
        assertions,
        10000
      );

      expect(result.success).toBe(true);
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].resolved).toBe(true);
      expect(result.interactions[0].conflicted).toBe(false);
      expect(result.errors).toHaveLength(0);
      expect(result.networkMetrics.desyncEvents).toBe(0);
    });

    test('should handle alliance formation between players', async () => {
      const config = createMultiplayerConfig({
        playerCount: 3,
        networkSettings: {
          latencyMs: 75,
          packetLoss: 0.005,
          jitter: 15,
          enableDesync: false
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const allianceInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'alliance',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            allianceType: 'defensive',
            terms: {
              mutualDefense: true,
              resourceSharing: false,
              duration: '30-days'
            }
          }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-3',
          payload: {
            allianceType: 'economic',
            terms: {
              mutualDefense: false,
              resourceSharing: true,
              tradeBonus: 0.1
            }
          }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'alliance-formation',
        allianceInteractions,
        [MultiplayerAssertions.gameStateConsistency()],
        15000
      );

      expect(result.success).toBe(true);
      expect(result.interactions).toHaveLength(2);
      expect(result.interactions.every(i => i.resolved)).toBe(true);
      expect(result.conflictResolutions).toHaveLength(0);
    });

    test('should handle resource transfers between allied players', async () => {
      const config = createMultiplayerConfig({
        playerCount: 2,
        startingResources: {
          credits: 8000,
          energy: 4000,
          metal: 1500,
          research: 800
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const transferInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            resourceType: DB_FIELDS.EMPIRES.ENERGY,
            quantity: 1000
          }
        },
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-1',
          payload: {
            resourceType: 'research',
            quantity: 200
          }
        }
      ];

      const assertions: GameAssertion[] = [
        {
          type: 'resource',
          empireId: 'player-1',
          condition: (state) => state.resources.energy === 3000 && state.resources.research === 1000,
          description: 'Player 1 should have given energy and received research',
          required: true
        },
        {
          type: 'resource',
          empireId: 'player-2',
          condition: (state) => state.resources.energy === 5000 && state.resources.research === 600,
          description: 'Player 2 should have received energy and given research',
          required: true
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'resource-transfer',
        transferInteractions,
        assertions,
        12000
      );

      expect(result.success).toBe(true);
      expect(result.playerStates).toHaveLength(2);
      expect(result.networkMetrics.totalDataTransferred).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution', () => {
    test('should resolve simultaneous trade conflicts', async () => {
      const config = createMultiplayerConfig({
        playerCount: 3,
        startingResources: {
          credits: 5000,
          energy: 2000,
          metal: 1000,
          research: 300
        },
        syncSettings: {
          tickRate: 20,
          maxDesyncTolerance: 200,
          conflictResolutionMode: 'server-authoritative'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Both player-2 and player-3 try to buy the same metal from player-1
      const conflictingTrades: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            resourceType: 'metal',
            quantity: 800,
            pricePerUnit: 6
          }
        },
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-3',
          payload: {
            resourceType: 'metal',
            quantity: 600,
            pricePerUnit: 7
          }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'trade-conflict',
        conflictingTrades,
        [MultiplayerAssertions.noNegativeResources()],
        20000
      );

      expect(result.success).toBe(true);
      expect(result.conflictResolutions.length).toBeGreaterThanOrEqual(0);
      // At least one trade should succeed based on server authority
      expect(result.interactions.some(i => i.resolved)).toBe(true);
    });

    test('should handle territory expansion conflicts', async () => {
      const config = createMultiplayerConfig({
        playerCount: 2,
        worldSettings: {
          galaxySize: 'small',
          resourceScarcity: 'normal',
          conflictLevel: 'aggressive'
        },
        syncSettings: {
          conflictResolutionMode: 'server-authoritative'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const territoryConflicts: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'attack',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            target: 'A00:00:25:00', // Neutral territory
            attackingForce: [
              { unitType: 'fighter', quantity: 10, attack: 15 },
              { unitType: 'bomber', quantity: 5, attack: 25 }
            ]
          }
        },
        {
          type: 'attack',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-1',
          payload: {
            target: 'A00:00:25:00', // Same target!
            attackingForce: [
              { unitType: 'cruiser', quantity: 3, attack: 40 }
            ]
          }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'territory-conflict',
        territoryConflicts,
        [MultiplayerAssertions.territoryIntegrity()],
        25000
      );

      expect(result.success).toBe(true);
      expect(result.conflictResolutions.some(c => c.type === 'territory_conflict')).toBe(true);
      // One player should control the disputed territory
      const totalTerritories = result.playerStates.reduce((sum, player) => sum + player.territories.length, 0);
      expect(totalTerritories).toBeGreaterThan(2); // Both starting territories plus the contested one
    });

    test('should handle network latency and synchronization', async () => {
      const config = createMultiplayerConfig({
        playerCount: 4,
        networkSettings: {
          latencyMs: 200,
          packetLoss: 0.02,
          jitter: 50,
          enableDesync: true
        },
        syncSettings: {
          tickRate: 5,
          maxDesyncTolerance: 1000,
          conflictResolutionMode: 'rollback'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Rapid sequence of interactions that could cause desync
      const rapidInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: { resourceType: 'metal', quantity: 100, pricePerUnit: 3 }
        },
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-3',
          payload: { resourceType: DB_FIELDS.EMPIRES.ENERGY, quantity: 500 }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-3',
          targetPlayerId: 'player-4',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        },
        {
          type: 'research_sharing',
          sourcePlayerId: 'player-4',
          targetPlayerId: 'player-1',
          payload: { technologyKey: 'energy_efficiency', shareType: 'grant' }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'network-stress',
        rapidInteractions,
        [
          MultiplayerAssertions.gameStateConsistency(),
          MultiplayerAssertions.noNegativeResources()
        ],
        30000
      );

      expect(result.success).toBe(true);
      expect(result.synchronizationEvents.length).toBeGreaterThan(0);
      expect(result.networkMetrics.averageLatency).toBeGreaterThan(150);
      expect(result.networkMetrics.maxLatency).toBeGreaterThan(200);
      
      // Network stress may cause some resyncs
      if (result.networkMetrics.desyncEvents > 0) {
        expect(result.networkMetrics.resyncCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Advanced Multiplayer Scenarios', () => {
    test('should handle complex multi-player economic scenario', async () => {
      const config = createMultiplayerConfig({
        playerCount: 4,
        startingResources: {
          credits: 10000,
          energy: 3000,
          metal: 2000,
          research: 1000
        },
        worldSettings: {
          galaxySize: 'large',
          resourceScarcity: 'scarce',
          conflictLevel: 'peaceful'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Complex economic scenario with chains of trades
      const economicInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        // Player 1 forms alliance with Player 2
        {
          type: 'alliance',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            allianceType: 'economic',
            terms: { resourceSharing: true, tradeBonus: 0.15 }
          }
        },
        // Allied players start resource sharing
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: { resourceType: 'metal', quantity: 500 }
        },
        // Player 2 uses extra metal to trade with Player 3
        {
          type: 'trade',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-3',
          payload: { resourceType: 'metal', quantity: 800, pricePerUnit: 4 }
        },
        // Player 3 shares research with Player 4
        {
          type: 'research_sharing',
          sourcePlayerId: 'player-3',
          targetPlayerId: 'player-4',
          payload: { technologyKey: 'advanced_mining', shareType: 'grant' }
        },
        // Player 4 forms military alliance with Player 1 (creating triangle)
        {
          type: 'alliance',
          sourcePlayerId: 'player-4',
          targetPlayerId: 'player-1',
          payload: {
            allianceType: 'military',
            terms: { mutualDefense: true, jointOperations: true }
          }
        },
        // Final resource redistribution
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-3',
          targetPlayerId: 'player-1',
          payload: { resourceType: DB_FIELDS.EMPIRES.ENERGY, quantity: 1000 }
        }
      ];

      const complexAssertions: GameAssertion[] = [
        MultiplayerAssertions.noNegativeResources(),
        MultiplayerAssertions.gameStateConsistency(),
        {
          type: 'custom',
          condition: (state) => state.resources.credits >= 5000,
          description: 'All players should maintain reasonable credit levels',
          required: true
        },
        {
          type: 'custom',
          condition: (state) => Object.values(state.resources).reduce((sum: number, val: number) => sum + val, 0) >= 10000,
          description: 'Total resources should remain above minimum threshold',
          required: true
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'complex-economy',
        economicInteractions,
        complexAssertions,
        45000
      );

      expect(result.success).toBe(true);
      expect(result.interactions).toHaveLength(6);
      expect(result.interactions.every(i => i.resolved)).toBe(true);
      expect(result.playerStates).toHaveLength(4);
      
      // Check that economic relationships were established
      const hasTradeInteractions = result.interactions.some(i => i.type === 'trade');
      const hasAllianceInteractions = result.interactions.some(i => i.type === 'alliance');
      const hasResourceTransfers = result.interactions.some(i => i.type === 'resource_transfer');
      
      expect(hasTradeInteractions).toBe(true);
      expect(hasAllianceInteractions).toBe(true);
      expect(hasResourceTransfers).toBe(true);
    });

    test('should handle large-scale multiplayer war scenario', async () => {
      const config = createMultiplayerConfig({
        playerCount: 6,
        startingResources: {
          credits: 15000,
          energy: 5000,
          metal: 3000,
          research: 1500
        },
        worldSettings: {
          galaxySize: 'large',
          resourceScarcity: 'normal',
          conflictLevel: 'aggressive'
        },
        networkSettings: {
          latencyMs: 120,
          packetLoss: 0.01,
          jitter: 25,
          enableDesync: false
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Large scale war with multiple fronts
      const warInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        // Form two opposing alliances
        {
          type: 'alliance',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-3',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-4',
          targetPlayerId: 'player-5',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-4',
          targetPlayerId: 'player-6',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        },
        
        // Start conflicts on multiple fronts
        {
          type: 'attack',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-4',
          payload: {
            target: 'A00:00:25:00',
            attackingForce: [
              { unitType: 'fighter', quantity: 20, attack: 15 },
              { unitType: 'cruiser', quantity: 5, attack: 40 }
            ]
          }
        },
        {
          type: 'attack',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-5',
          payload: {
            target: 'A00:00:25:01',
            attackingForce: [
              { unitType: 'bomber', quantity: 15, attack: 25 }
            ]
          }
        },
        {
          type: 'attack',
          sourcePlayerId: 'player-4',
          targetPlayerId: 'player-3',
          payload: {
            target: 'A00:00:25:02',
            attackingForce: [
              { unitType: 'dreadnought', quantity: 2, attack: 100 }
            ]
          }
        },

        // Resource support for war effort
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-3',
          targetPlayerId: 'player-1',
          payload: { resourceType: 'metal', quantity: 1000 }
        },
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-6',
          targetPlayerId: 'player-4',
          payload: { resourceType: DB_FIELDS.EMPIRES.ENERGY, quantity: 2000 }
        }
      ];

      const warAssertions: GameAssertion[] = [
        MultiplayerAssertions.territoryIntegrity(),
        MultiplayerAssertions.gameStateConsistency(),
        {
          type: 'custom',
          condition: (state) => state.territories.length >= 1,
          description: 'No player should lose all territories',
          required: true
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'large-scale-war',
        warInteractions,
        warAssertions,
        60000
      );

      expect(result.success).toBe(true);
      expect(result.interactions.length).toBeGreaterThan(8);
      expect(result.conflictResolutions.some(c => c.type === 'territory_conflict')).toBe(true);
      
      // Verify war mechanics worked
      const attackInteractions = result.interactions.filter(i => i.type === 'attack');
      expect(attackInteractions.length).toBeGreaterThan(2);
      
      // Check that alliances were formed
      const allianceInteractions = result.interactions.filter(i => i.type === 'alliance');
      expect(allianceInteractions.length).toBe(4);
    });

    test('should maintain game state consistency under extreme conditions', async () => {
      const config = createMultiplayerConfig({
        playerCount: 8,
        networkSettings: {
          latencyMs: 300,
          packetLoss: 0.05,
          jitter: 100,
          enableDesync: true
        },
        syncSettings: {
          tickRate: 20,
          maxDesyncTolerance: 500,
          conflictResolutionMode: 'rollback'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Generate many rapid interactions to stress test the system
      const stressInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [];
      
      // Generate 20 rapid interactions between random players
      for (let i = 0; i < 20; i++) {
        const sourcePlayer = `player-${Math.floor(Math.random() * 8) + 1}`;
        let targetPlayer = `player-${Math.floor(Math.random() * 8) + 1}`;
        while (targetPlayer === sourcePlayer) {
          targetPlayer = `player-${Math.floor(Math.random() * 8) + 1}`;
        }

        const interactionType = ['trade', 'resource_transfer', 'alliance'][Math.floor(Math.random() * 3)];
        
        let payload;
        switch (interactionType) {
          case 'trade':
            payload = {
              resourceType: ['metal', DB_FIELDS.EMPIRES.ENERGY, 'research'][Math.floor(Math.random() * 3)],
              quantity: Math.floor(Math.random() * 500) + 100,
              pricePerUnit: Math.floor(Math.random() * 10) + 1
            };
            break;
          case 'resource_transfer':
            payload = {
              resourceType: ['metal', DB_FIELDS.EMPIRES.ENERGY, 'research'][Math.floor(Math.random() * 3)],
              quantity: Math.floor(Math.random() * 300) + 50
            };
            break;
          case 'alliance':
            payload = {
              allianceType: ['economic', 'military', 'defensive'][Math.floor(Math.random() * 3)],
              terms: { mutualDefense: Math.random() > 0.5 }
            };
            break;
        }

        stressInteractions.push({
          type: interactionType as any,
          sourcePlayerId: sourcePlayer,
          targetPlayerId: targetPlayer,
          payload
        });
      }

      const stressAssertions: GameAssertion[] = [
        MultiplayerAssertions.noNegativeResources(),
        MultiplayerAssertions.gameStateConsistency(),
        MultiplayerAssertions.territoryIntegrity()
      ];

      const result = await engine.runMultiplayerScenario(
        'stress-test',
        stressInteractions,
        stressAssertions,
        90000
      );

      // Under extreme stress, the system should still maintain basic consistency
      expect(result.playerStates).toHaveLength(8);
      expect(result.synchronizationEvents.length).toBeGreaterThan(0);
      
      // May have some network issues but should recover
      if (result.networkMetrics.desyncEvents > 0) {
        expect(result.networkMetrics.resyncCount).toBeGreaterThan(0);
      }

      // Core game state should remain valid regardless of network issues
      const allPlayersHaveValidState = result.playerStates.every(player => 
        player.territories.length > 0 &&
        Object.values(player.resources).every((value: number) => value >= 0) &&
        player.empireId.length > 0
      );
      expect(allPlayersHaveValidState).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-frequency interactions efficiently', async () => {
      const config = createMultiplayerConfig({
        playerCount: 4,
        syncSettings: {
          tickRate: 30, // High tick rate
          maxDesyncTolerance: 100,
          conflictResolutionMode: 'server-authoritative'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      // Generate many small interactions
      const quickInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [];
      
      for (let i = 0; i < 50; i++) {
        quickInteractions.push({
          type: 'resource_transfer',
          sourcePlayerId: `player-${(i % 4) + 1}`,
          targetPlayerId: `player-${((i + 1) % 4) + 1}`,
          payload: {
            resourceType: DB_FIELDS.EMPIRES.CREDITS,
            quantity: 10
          }
        });
      }

      const startTime = Date.now();
      const result = await engine.runMultiplayerScenario(
        'high-frequency-test',
        quickInteractions,
        [MultiplayerAssertions.gameStateConsistency()],
        30000
      );
      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.interactions).toHaveLength(50);
      expect(totalTime).toBeLessThan(25000); // Should complete efficiently
      expect(result.networkMetrics.averageLatency).toBeLessThan(200);
    });

    test('should provide accurate network metrics and performance data', async () => {
      const config = createMultiplayerConfig({
        playerCount: 3,
        networkSettings: {
          latencyMs: 150,
          packetLoss: 0.02,
          jitter: 30,
          enableDesync: false
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const metricsInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: { resourceType: 'metal', quantity: 500, pricePerUnit: 3 }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-3',
          payload: { allianceType: 'economic', terms: { resourceSharing: true } }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'metrics-validation',
        metricsInteractions,
        [],
        15000
      );

      expect(result.success).toBe(true);
      expect(result.networkMetrics).toBeDefined();
      expect(result.networkMetrics.averageLatency).toBeGreaterThan(100);
      expect(result.networkMetrics.maxLatency).toBeGreaterThan(result.networkMetrics.averageLatency);
      expect(result.networkMetrics.totalDataTransferred).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.synchronizationEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid player interactions gracefully', async () => {
      const config = createMultiplayerConfig({
        playerCount: 2
      });

      const engine = new MultiplayerTestingEngine(config);

      const invalidInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: {
            resourceType: 'metal',
            quantity: 50000, // More than player has
            pricePerUnit: 5
          }
        },
        {
          type: 'resource_transfer',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'nonexistent-player', // Invalid player
          payload: {
            resourceType: DB_FIELDS.EMPIRES.ENERGY,
            quantity: 100
          }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'invalid-interactions',
        invalidInteractions,
        [MultiplayerAssertions.noNegativeResources()],
        10000
      );

      // System should remain stable despite invalid interactions
      expect(result.playerStates).toHaveLength(2);
      
      // Resources should remain non-negative
      const allResourcesNonNegative = result.playerStates.every(player =>
        Object.values(player.resources).every((value: number) => value >= 0)
      );
      expect(allResourcesNonNegative).toBe(true);
    });

    test('should recover from temporary network failures', async () => {
      const config = createMultiplayerConfig({
        playerCount: 3,
        networkSettings: {
          latencyMs: 100,
          packetLoss: 0.1, // High packet loss
          jitter: 50,
          enableDesync: true
        },
        syncSettings: {
          tickRate: 10,
          maxDesyncTolerance: 1000,
          conflictResolutionMode: 'rollback'
        }
      });

      const engine = new MultiplayerTestingEngine(config);

      const networkStressInteractions: Omit<PlayerInteraction, 'timestamp' | 'resolved' | 'conflicted'>[] = [
        {
          type: 'trade',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-2',
          payload: { resourceType: 'metal', quantity: 200, pricePerUnit: 4 }
        },
        {
          type: 'trade',
          sourcePlayerId: 'player-2',
          targetPlayerId: 'player-3',
          payload: { resourceType: DB_FIELDS.EMPIRES.ENERGY, quantity: 300, pricePerUnit: 3 }
        },
        {
          type: 'alliance',
          sourcePlayerId: 'player-1',
          targetPlayerId: 'player-3',
          payload: { allianceType: 'military', terms: { mutualDefense: true } }
        }
      ];

      const result = await engine.runMultiplayerScenario(
        'network-failure-recovery',
        networkStressInteractions,
        [MultiplayerAssertions.gameStateConsistency()],
        25000
      );

      // System should recover and maintain consistency
      expect(result.playerStates).toHaveLength(3);
      expect(result.synchronizationEvents.some(e => e.processed)).toBe(true);
      
      // May have experienced network issues but should have recovered
      if (result.networkMetrics.desyncEvents > 0) {
        expect(result.networkMetrics.resyncCount).toBeGreaterThanOrEqual(result.networkMetrics.desyncEvents);
      }
    });
  });
});
