import { DebrisSystem } from '../DebrisSystem';
import { Location, Empire } from '../../../../shared/src/types';

import { TIMEOUTS, GAME_CONSTANTS } from '@game/shared';
describe('DebrisSystem', () => {
  let debrisSystem: DebrisSystem;
  let locations: Map<string, Location>;
  let empires: Map<string, Empire>;

  beforeEach(() => {
    // Set up test data
    locations = new Map<string, Location>();
    empires = new Map<string, Empire>();

    // Create test asteroid
    locations.set('A00:10:22:10', {
      coord: 'A00:10:22:10',
      type: 'asteroid',
      properties: {
        fertility: 0,
        resources: {
          metal: 100,
          energy: GAME_CONSTANTS.STARTING_ENERGY,
          research: 0
        }
      },
      owner: null,
      createdAt: new Date()
    });

    // Create test empire
    empires.set('empire1', {
      _id: 'empire1',
      userId: 'user1',
      name: 'Test Empire',
      resources: {
        credits: 1000,
        energy: GAME_CONSTANTS.STARTING_ENERGY
      },
      creditsRemainderMilli: 0,
      baseCount: 1,
      hasDeletedBase: false,
      territories: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize system
    debrisSystem = new DebrisSystem(locations, empires);
  });

  afterEach(() => {
    // Clean up
    debrisSystem.stop();
  });

  test('adds recycler to asteroid', () => {
    const result = debrisSystem.addRecycler('A00:10:22:10', 'empire1');
    expect(result).toBe(true);

    const location = locations.get('A00:10:22:10');
    expect(location?.debris?.recyclers.length).toBe(1);
    expect(location?.debris?.recyclers[0].empireId).toBe('empire1');
  });

  test('prevents duplicate recyclers from same empire', () => {
    debrisSystem.addRecycler('A00:10:22:10', 'empire1');
    const result = debrisSystem.addRecycler('A00:10:22:10', 'empire1');
    expect(result).toBe(false);

    const location = locations.get('A00:10:22:10');
    expect(location?.debris?.recyclers.length).toBe(1);
  });

  test('removes recycler from asteroid', () => {
    debrisSystem.addRecycler('A00:10:22:10', 'empire1');
    const result = debrisSystem.removeRecycler('A00:10:22:10', 'empire1');
    expect(result).toBe(true);

    const location = locations.get('A00:10:22:10');
    expect(location?.debris?.recyclers.length).toBe(0);
  });

  test('generates debris over time', async () => {
    const location = locations.get('A00:10:22:10')!;
    
    // Ensure debris is initialized
    expect(location.debris).toBeDefined();
    const initialAmount = location.debris!.amount;
    const generationRate = location.debris!.generationRate;

    // Wait for 2 seconds of debris generation
    await new Promise(resolve => setTimeout(resolve, TIMEOUTS.TWO_SECONDS));

    // Should have approximately 2 seconds worth of debris
    const expectedMinimum = initialAmount + (generationRate * 1.5); // Allow some wiggle room
    expect(location.debris!.amount).toBeGreaterThan(expectedMinimum);
  });

  test('collects and distributes debris among recyclers', async () => {
    // Add two empires with recyclers
    empires.set('empire2', {
      _id: 'empire2',
      userId: 'user2',
      name: 'Test Empire 2',
      resources: {
        credits: 1000,
        energy: GAME_CONSTANTS.STARTING_ENERGY
      },
      creditsRemainderMilli: 0,
      baseCount: 1,
      hasDeletedBase: false,
      territories: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const location = locations.get('A00:10:22:10')!;
    location.debris = {
      amount: 100,
      generationRate: 5,
      recyclers: []
    };

    // Add recyclers from both empires
    debrisSystem.addRecycler('A00:10:22:10', 'empire1');
    debrisSystem.addRecycler('A00:10:22:10', 'empire2');

    // Wait for collection to occur
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Check that debris was collected and credits distributed
    const empire1 = empires.get('empire1')!;
    const empire2 = empires.get('empire2')!;

    // Both empires should have received credits
    expect(empire1.resources.credits).toBeGreaterThan(1000);
    expect(empire2.resources.credits).toBeGreaterThan(1000);

    // Credits should be roughly equal between empires
    const creditDiff = Math.abs(empire1.resources.credits - empire2.resources.credits);
    expect(creditDiff).toBeLessThanOrEqual(1); // Allow for rounding differences
  });
});