import { Empire, Location, randomInt } from '@game/shared';

export class DebrisSystem {
  private static readonly DEBRIS_TICK_INTERVAL = 1000; // 1 second tick
  private static readonly MIN_GENERATION_RATE = 1;
  private static readonly MAX_GENERATION_RATE = 10;
  private static readonly COLLECTION_RATE = 10; // debris per second per recycler
  private static readonly CREDITS_PER_DEBRIS = 1;

  private tickInterval: NodeJS.Timeout | null = null;

  constructor(
    private locations: Map<string, Location>,
    private empires: Map<string, Empire>
  ) {
    this.startDebrisGeneration();
  }

  /**
   * Start the debris generation system
   */
  private startDebrisGeneration(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    this.tickInterval = setInterval(() => {
      this.processTick();
    }, DebrisSystem.DEBRIS_TICK_INTERVAL);
  }

  /**
   * Stop the debris generation system
   */
  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Process a single tick for all asteroids
   */
  private processTick(): void {
    for (const [coord, location] of this.locations.entries()) {
      if (location.type === 'asteroid') {
        this.processAsteroidTick(coord, location);
      }
    }
  }

  /**
   * Process a single tick for one asteroid
   */
  private processAsteroidTick(coord: string, location: Location): void {
    // Initialize debris object if it doesn't exist
    if (!location.debris) {
      location.debris = {
        amount: 0,
        generationRate: this.generateRandomRate(),
        recyclers: []
      };
    }

    // Generate debris
    location.debris.amount += location.debris.generationRate;

    // Process recyclers
    if (location.debris.recyclers.length > 0) {
      this.processRecyclers(coord, location);
    }
  }

  /**
   * Process recyclers at an asteroid
   */
  private processRecyclers(coord: string, location: Location): void {
    if (!location.debris) return;

    // Calculate total debris to collect this tick
    const totalToCollect = Math.min(
      location.debris.amount,
      location.debris.recyclers.length * DebrisSystem.COLLECTION_RATE
    );

    if (totalToCollect <= 0) return;

    // Distribute debris evenly among recyclers
    const perRecycler = Math.floor(totalToCollect / location.debris.recyclers.length);
    const remainder = totalToCollect % location.debris.recyclers.length;

    // Process each recycler
    location.debris.recyclers.forEach((recycler, index) => {
      const empire = this.empires.get(recycler.empireId);
      if (!empire) return;

      // Calculate debris for this recycler (including remainder distribution)
      let debrisForRecycler = perRecycler;
      if (index < remainder) {
        debrisForRecycler++;
      }

      // Convert debris to credits
      const credits = debrisForRecycler * DebrisSystem.CREDITS_PER_DEBRIS;
      empire.resources.credits += credits;
    });

    // Remove collected debris
    location.debris.amount -= totalToCollect;
  }

  /**
   * Add a recycler to an asteroid
   */
  public addRecycler(coord: string, empireId: string): boolean {
    const location = this.locations.get(coord);
    if (!location || location.type !== 'asteroid') return false;

    // Initialize debris object if needed
    if (!location.debris) {
      location.debris = {
        amount: 0,
        generationRate: this.generateRandomRate(),
        recyclers: []
      };
    }

    // Add recycler if not already present
    if (!location.debris.recyclers.some(r => r.empireId === empireId)) {
      location.debris.recyclers.push({
        empireId,
        startedAt: new Date()
      });
      return true;
    }

    return false;
  }

  /**
   * Remove a recycler from an asteroid
   */
  public removeRecycler(coord: string, empireId: string): boolean {
    const location = this.locations.get(coord);
    if (!location || !location.debris) return false;

    const initialLength = location.debris.recyclers.length;
    location.debris.recyclers = location.debris.recyclers.filter(r => r.empireId !== empireId);

    return location.debris.recyclers.length !== initialLength;
  }

  /**
   * Generate a random debris generation rate
   */
  private generateRandomRate(): number {
    return randomInt(
      DebrisSystem.MIN_GENERATION_RATE,
      DebrisSystem.MAX_GENERATION_RATE
    );
  }

  /**
   * Get current debris amount at a location
   */
  public getDebrisAmount(coord: string): number {
    const location = this.locations.get(coord);
    return location?.debris?.amount ?? 0;
  }

  /**
   * Get debris generation rate at a location
   */
  public getGenerationRate(coord: string): number {
    const location = this.locations.get(coord);
    return location?.debris?.generationRate ?? 0;
  }

  /**
   * Get all recyclers at a location
   */
  public getRecyclers(coord: string): { empireId: string; startedAt: Date }[] {
    const location = this.locations.get(coord);
    return location?.debris?.recyclers ?? [];
  }
}