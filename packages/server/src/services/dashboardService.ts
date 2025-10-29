import { Empire } from '../../models/Empire';
import { EconomyService } from './economyService';
import { ResourceService } from './resourceService';
import { ERROR_MESSAGES } from '../constants/response-formats';
import { CapacityService } from '../services/bases/CapacityService';

/**
 * Service for aggregating and returning dashboard data
 */
export class DashboardService {
  /**
   * Get dashboard summary data for an empire
   */
  static async getDashboardData(empireId: string) {
    // Get empire and base info
    const empire = await Empire.findById(empireId);
    if (!empire) throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);

    // Get territory info 
    const baseCount = empire.territories?.length || 0;

    // Get economic breakdown
    const economicBreakdown = await EconomyService.computeEmpireEconomy(empireId);
    
    // Get primary base capacities
    const capacities = await CapacityService.getBaseCapacities(empireId, empire.territories[0]);

    // Get resource rates
    const resourceRates = await ResourceService.calculateResourceRates(empireId);

    return {
      empire: {
        id: empire.id,
        name: empire.name,
        baseCount,
        territories: empire.territories,
      },
      resources: {
        ...empire.resources,
        rates: resourceRates
      },
      economy: {
        creditsPerHour: economicBreakdown.totalCreditsPerHour,
        researchPoints: economicBreakdown.totalResearchPoints,
      },
      capacities: {
        construction: capacities.construction,
        research: capacities.research,
        production: capacities.production
      }
    };
  }
}

