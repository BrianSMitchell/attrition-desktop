import { DebrisSystem } from '../DebrisSystem';
import { Location, Empire } from '../../../../shared/src/types';

describe('DebrisSystem Integration', () => {
  let debrisSystem: DebrisSystem;
  let locations: Map<string, Location>;
  let empires: Map<string, Empire>;
  
  const ASTEROID_COUNT = 10;
  const EMPIRE_COUNT = 5;
  const SIMULATION_TIME = 5000; // 5 seconds

  beforeEach(() => {
    locations = new Map<string, Location>();
    empires = new Map<string, Empire>();

    // Create test asteroids
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const coord = `A00:10:22:${i.toString().padStart(2, '0')}`;
      locations.set(coord, createTestLocation(coord));
    }

    // Create test empires
    for (let i = 0; i < EMPIRE_COUNT; i++) {
      const id = `empire${i + 1}`;
      empires.set(id, createTestEmpire(id));
    }

    debrisSystem = new DebrisSystem(locations, empires);
  });

  afterEach(() => {
    debrisSystem.stop();
  });

  test('complete system simulation', async () => {
    // Track initial credits
    const initialCredits = new Map<string, number>();
    empires.forEach((empire, id) => {
      initialCredits.set(id, empire.resources.credits);
    });

    // Add recyclers randomly to asteroids
    for (const [coord] of locations) {
      // Randomly select 1-3 empires to add recyclers
      const recyclerCount = Math.floor(Math.random() * 3) + 1;
      const empireIds = Array.from(empires.keys());
      
      for (let i = 0; i < recyclerCount; i++) {
        const randomIndex = Math.floor(Math.random() * empireIds.length);
        const empireId = empireIds[randomIndex];
        empireIds.splice(randomIndex, 1); // Remove used empire
        
        debrisSystem.addRecycler(coord, empireId);
      }

      // Verify recycler setup
      const location = locations.get(coord)!;
      expect(location).toHaveValidRecyclerSetup();
    }

    // Let the system run
    await new Promise(resolve => setTimeout(resolve, SIMULATION_TIME));

    // Verify results
    for (const [coord, location] of locations) {
      // Check debris state
      expect(location).toHaveValidDebrisState();
      
      // Verify debris amount is reasonable
      if (location.debris!.recyclers.length > 0) {
        // With active recyclers, debris should be relatively low
        expect(location.debris!.amount).toBeLessThan(100);
      } else {
        // Without recyclers, debris should have accumulated
        const expectedMinimum = location.debris!.generationRate * (SIMULATION_TIME / 1000);
        expect(location.debris!.amount).toBeGreaterThan(expectedMinimum * 0.9); // Allow 10% margin
      }
    }

    // Verify empire credits increased appropriately
    empires.forEach((empire, id) => {
      const initialCredit = initialCredits.get(id)!;
      const creditIncrease = empire.resources.credits - initialCredit;
      
      // Count how many recyclers this empire has
      let recyclerCount = 0;
      locations.forEach(location => {
        recyclerCount += location.debris?.recyclers.filter(r => r.empireId === id).length ?? 0;
      });

      if (recyclerCount > 0) {
        // Empire should have earned credits
        expect(creditIncrease).toBeGreaterThan(0);
        
        // Rough estimate of expected credits
        // Each recycler collects 10 debris/second = 10 credits/second
        const expectedMinimum = recyclerCount * 10 * (SIMULATION_TIME / 1000) * 0.5; // 50% margin for competition
        expect(creditIncrease).toBeGreaterThan(expectedMinimum);
      } else {
        // Empire without recyclers shouldn't earn credits
        expect(creditIncrease).toBe(0);
      }
    });
  });

  test('system resilience', async () => {
    // Add and remove recyclers rapidly
    const coord = 'A00:10:22:00';
    const empireId = 'empire1';
    
    // Start a loop of adding/removing recyclers
    const interval = setInterval(() => {
      if (Math.random() < 0.5) {
        debrisSystem.addRecycler(coord, empireId);
      } else {
        debrisSystem.removeRecycler(coord, empireId);
      }
    }, 100);

    // Let it run
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    clearInterval(interval);

    // System should still be stable
    const location = locations.get(coord)!;
    expect(location).toHaveValidDebrisState();
  });

  test('performance under load', async () => {
    // Add maximum recyclers to all asteroids
    for (const [coord] of locations) {
      for (const [empireId] of empires) {
        debrisSystem.addRecycler(coord, empireId);
      }
    }

    const startTime = Date.now();
    
    // Run for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should not have significant timing drift
    expect(duration).toBeLessThan(1200); // Allow 20% margin

    // All locations should still be valid
    for (const [, location] of locations) {
      expect(location).toHaveValidDebrisState();
      expect(location).toHaveValidRecyclerSetup();
    }
  });
});