import { Empire, TechnologyKey } from '@game/shared';

/**
 * Service for managing empire technology
 */
export class TechService {
  constructor(
    private readonly empire: Empire
  ) {}

  /**
   * Get the current tech level for a given technology
   */
  public getTechLevel(techKey: TechnologyKey): number {
    return this.empire.techLevels?.get(techKey) || 0;
  }

  /**
   * Check if empire meets a technology requirement
   */
  public meetsRequirement(techKey: TechnologyKey, requiredLevel: number): boolean {
    return this.getTechLevel(techKey) >= requiredLevel;
  }

  /**
   * Update a technology level
   */
  public setTechLevel(techKey: TechnologyKey, level: number): void {
    if (!this.empire.techLevels) {
      this.empire.techLevels = new Map();
    }
    this.empire.techLevels.set(techKey, level);
  }
}