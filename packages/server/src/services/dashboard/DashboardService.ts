import { Response } from 'express';
import { EmpireResolutionService } from '../empire/EmpireResolutionService';
import { ResourceCalculationService } from '../resources/ResourceCalculationService';
import { getOnlineUniqueUsersCount } from '../socketService';

/**
 * DashboardService handles dashboard-related business logic 
 */
export class DashboardService {
  /**
   * Gets dashboard data for an authenticated user
   * @param user - The authenticated user object
   * @returns Promise<DashboardData> - Complete dashboard data
   * @throws AuthenticationError - if user ID is missing
   * @throws DatabaseError - if empire resolution fails
   */
  static async getDashboardData(user: any): Promise<DashboardData> {
    const userId = user?._id || user?.id;

    // Resolve empire using the service (includes auto-bootstrap if needed)
    let empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);

    // If no empire after service resolution, return new-player payload
    if (!empireRow) {
      return this.createNewPlayerResponse(user);
    }

    // Use ResourceCalculationService to handle complex resource calculations
    const { resourcesGained, creditsPerHour, profile, updatedEmpire } = await ResourceCalculationService.calculateDashboardResources(empireRow, userId);

    // Update empireRow with any changes from the calculation service 
    empireRow = updatedEmpire;

    return {
      user,
      empire: empireRow,
      resourcesGained,
      creditsPerHour,
      profile,
      isNewPlayer: false,
      serverInfo: {
        name: 'Alpha Server',
        version: '1.0.0',
        playersOnline: getOnlineUniqueUsersCount(),
        universeSize: { width: 100, height: 100 }
      }
    };
  }

  /**
   * Creates the response for new players without an empire
   * @param user - The authenticated user object
   * @returns DashboardData - New player response data
   */
  private static createNewPlayerResponse(user: any): DashboardData {
    return {
      user,
      empire: null,
      resourcesGained: 0,
      creditsPerHour: 0,
      profile: null,
      isNewPlayer: true,
      serverInfo: {
        name: 'Alpha Server',
        version: '1.0.0',
        playersOnline: getOnlineUniqueUsersCount(),
        universeSize: { width: 100, height: 100 }
      }
    };
  }
}

/**
 * Interface definitions for dashboard data structures
 */
export interface DashboardData {
  user: any;
  empire: any;
  resourcesGained: number;
  creditsPerHour: number;
  profile: any;
  isNewPlayer: boolean;
  serverInfo: {
    name: string;
    version: string;
    playersOnline: number;
    universeSize: { width: number; height: number };
  };
}