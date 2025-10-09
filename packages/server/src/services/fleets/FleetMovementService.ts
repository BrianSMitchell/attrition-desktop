import { supabase } from '../../config/supabase';
import { getIO } from '../../index';
import { getUnitSpec } from '@game/shared';

export interface CoordinateParsed {
  server: string;
  galaxy: number;
  region: number;
  system: number;
  body: number;
}

export interface FleetDispatchRequest {
  destinationCoord: string;
}

export interface FleetDispatchResult {
  success: boolean;
  movement?: any;
  error?: string;
  code?: string;
}

export interface FleetStatusResult {
  success: boolean;
  fleet?: any;
  movement?: any;
  error?: string;
}

export interface FleetRecallResult {
  success: boolean;
  movement?: any;
  error?: string;
  code?: string;
}

export class FleetMovementService {
  /**
   * Parse coordinate string into components
   */
  static parseCoordinate(coord: string): CoordinateParsed {
    const match = coord.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid coordinate format: ${coord}`);
    }

    return {
      server: match[1],
      galaxy: parseInt(match[2], 10),
      region: parseInt(match[3], 10),
      system: parseInt(match[4], 10),
      body: parseInt(match[5], 10),
    };
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(from: string, to: string): number {
    const fromCoord = this.parseCoordinate(from);
    const toCoord = this.parseCoordinate(to);

    // Calculate distance using galactic coordinate system
    // Galaxy level = 1000 units, Region = 100 units, System = 10 units, Body = 1 unit
    const galaxyDist = Math.abs(fromCoord.galaxy - toCoord.galaxy) * 1000;
    const regionDist = Math.abs(fromCoord.region - toCoord.region) * 100;
    const systemDist = Math.abs(fromCoord.system - toCoord.system) * 10;
    const bodyDist = Math.abs(fromCoord.body - toCoord.body) * 1;

    // Use largest distance as base (only travel the farthest distance needed)
    return Math.max(galaxyDist, regionDist, systemDist, bodyDist);
  }

  /**
   * Calculate fleet speed based on slowest unit
   */
  static calculateFleetSpeed(units: Array<{ unitKey: string; count: number }>): number {
    let slowestSpeed = Infinity;

    for (const unit of units) {
      if (unit.count > 0) {
        const unitSpec = getUnitSpec(unit.unitKey as any);
        if (unitSpec && unitSpec.speed !== undefined) {
          slowestSpeed = Math.min(slowestSpeed, unitSpec.speed);
        }
      }
    }

    // Default speed if no units have speed defined
    return slowestSpeed === Infinity ? 1 : slowestSpeed;
  }

  /**
   * Calculate travel time in hours
   */
  static calculateTravelTime(distance: number, fleetSpeed: number): number {
    // Base travel time formula: distance / (speed * speedMultiplier)
    const baseSpeedMultiplier = 10; // Adjust this to balance travel times
    const travelTimeHours = distance / (fleetSpeed * baseSpeedMultiplier);

    // Minimum travel time of 5 minutes
    return Math.max(travelTimeHours, 0.083);
  }

  /**
   * Validate destination coordinate
   */
  static async validateDestination(destinationCoord: string, empireId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Parse coordinate format
      this.parseCoordinate(destinationCoord);

      // Check if destination exists in universe
      const { data: location, error } = await supabase
        .from('locations')
        .select('coord')
        .eq('coord', destinationCoord)
        .maybeSingle();

      if (error || !location) {
        return { valid: false, error: 'Destination does not exist in the universe' };
      }

      // For now, allow movement to any location
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid coordinate format' };
    }
  }

  /**
   * Dispatch a fleet to a new location
   */
  static async dispatchFleet(
    fleetId: string,
    empireId: string,
    request: FleetDispatchRequest
  ): Promise<FleetDispatchResult> {
    try {
      // Find the fleet
      const { data: fleet, error: fleetError } = await supabase
        .from('fleets')
        .select('*')
        .eq('id', fleetId)
        .eq('empire_id', empireId)
        .maybeSingle();

      if (fleetError || !fleet) {
        return {
          success: false,
          error: 'Fleet not found',
          code: 'FLEET_NOT_FOUND',
        };
      }

      // Check if fleet has any units
      const units = fleet.units || [];
      if (!units.length || units.every((u: any) => u.count === 0)) {
        return {
          success: false,
          error: 'Fleet has no units to dispatch',
          code: 'EMPTY_FLEET',
        };
      }

      // Check if fleet is already moving
      const { data: existingMovement, error: movementCheckError } = await supabase
        .from('fleet_movements')
        .select('id')
        .eq('fleet_id', fleetId)
        .in('status', ['pending', 'travelling'])
        .maybeSingle();

      if (movementCheckError) {
        console.error('Error checking for existing movement:', movementCheckError);
      }

      if (existingMovement) {
        return {
          success: false,
          error: 'Fleet is already moving',
          code: 'FLEET_ALREADY_MOVING',
        };
      }

      // Validate destination
      const destinationValidation = await this.validateDestination(request.destinationCoord, empireId);
      if (!destinationValidation.valid) {
        return {
          success: false,
          error: destinationValidation.error || 'Invalid destination',
          code: 'INVALID_DESTINATION',
        };
      }

      // Can't move to same location
      if (fleet.location_coord === request.destinationCoord) {
        return {
          success: false,
          error: 'Fleet is already at the destination',
          code: 'ALREADY_AT_DESTINATION',
        };
      }

      // Calculate movement parameters
      const distance = this.calculateDistance(fleet.location_coord, request.destinationCoord);
      const fleetSpeed = this.calculateFleetSpeed(units);
      const travelTimeHours = this.calculateTravelTime(distance, fleetSpeed);

      const departureTime = new Date();
      const estimatedArrivalTime = new Date(departureTime.getTime() + travelTimeHours * 60 * 60 * 1000);

      // Create movement record
      const { data: movement, error: createError } = await supabase
        .from('fleet_movements')
        .insert({
          empire_id: empireId,
          fleet_id: fleetId,
          origin_coord: fleet.location_coord,
          destination_coord: request.destinationCoord,
          units: units,
          size_credits: fleet.size_credits,
          departure_time: departureTime.toISOString(),
          estimated_arrival_time: estimatedArrivalTime.toISOString(),
          status: 'travelling',
          travel_time_hours: travelTimeHours,
          fleet_speed: fleetSpeed,
          distance: distance,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating fleet movement:', createError);
        return {
          success: false,
          error: 'Failed to dispatch fleet',
          code: 'DISPATCH_ERROR',
        };
      }

      // Emit socket event for fleet movement start
      const socket = getIO();
      if (socket) {
        socket.to(`empire:${empireId}`).emit('fleet:movement', {
          fleetId: fleetId,
          originCoord: movement.origin_coord,
          destinationCoord: movement.destination_coord,
          departureTime: movement.departure_time,
          estimatedArrivalTime: movement.estimated_arrival_time,
          travelTimeHours: movement.travel_time_hours,
          status: movement.status,
        });
      }

      return {
        success: true,
        movement,
      };
    } catch (error) {
      console.error('Error dispatching fleet:', error);
      return {
        success: false,
        error: 'Failed to dispatch fleet',
        code: 'DISPATCH_ERROR',
      };
    }
  }

  /**
   * Get fleet status including movement information
   */
  static async getFleetStatus(fleetId: string, empireId: string): Promise<FleetStatusResult> {
    try {
      // Find the fleet
      const { data: fleet, error: fleetError } = await supabase
        .from('fleets')
        .select('*')
        .eq('id', fleetId)
        .eq('empire_id', empireId)
        .maybeSingle();

      if (fleetError || !fleet) {
        return {
          success: false,
          error: 'Fleet not found',
        };
      }

      // Find active movement
      const { data: movement, error: movementError } = await supabase
        .from('fleet_movements')
        .select('*')
        .eq('fleet_id', fleetId)
        .in('status', ['pending', 'travelling'])
        .maybeSingle();

      if (movementError) {
        console.error('Error fetching movement:', movementError);
      }

      // Get fleet composition with unit details
      const units = fleet.units || [];
      const fleetWithDetails = {
        id: fleet.id,
        name: fleet.name,
        locationCoord: fleet.location_coord,
        units: units.map((unit: any) => {
          const unitSpec = getUnitSpec(unit.unitKey as any);
          return {
            unitKey: unit.unitKey,
            name: unitSpec?.name || unit.unitKey,
            count: unit.count,
          };
        }),
        sizeCredits: fleet.size_credits,
        isMoving: !!movement,
        movement: movement
          ? {
              status: movement.status,
              originCoord: movement.origin_coord,
              destinationCoord: movement.destination_coord,
              departureTime: movement.departure_time,
              estimatedArrivalTime: movement.estimated_arrival_time,
              travelTimeHours: movement.travel_time_hours,
              fleetSpeed: movement.fleet_speed,
              distance: movement.distance,
            }
          : null,
      };

      return {
        success: true,
        fleet: fleetWithDetails,
        movement: movement || undefined,
      };
    } catch (error) {
      console.error('Error getting fleet status:', error);
      return {
        success: false,
        error: 'Failed to get fleet status',
      };
    }
  }

  /**
   * Recall a fleet (if it hasn't arrived yet)
   */
  static async recallFleet(fleetId: string, empireId: string, reason?: string): Promise<FleetRecallResult> {
    try {
      // Find active movement
      const { data: movement, error: findError } = await supabase
        .from('fleet_movements')
        .select('*')
        .eq('fleet_id', fleetId)
        .eq('empire_id', empireId)
        .in('status', ['pending', 'travelling'])
        .maybeSingle();

      if (findError || !movement) {
        return {
          success: false,
          error: 'No active movement found for this fleet',
          code: 'NO_ACTIVE_MOVEMENT',
        };
      }

      // Check if fleet has already arrived
      if (movement.status === 'arrived') {
        return {
          success: false,
          error: 'Fleet has already arrived and cannot be recalled',
          code: 'ALREADY_ARRIVED',
        };
      }

      // Update movement status to recalled
      const { data: updatedMovement, error: updateError } = await supabase
        .from('fleet_movements')
        .update({
          status: 'recalled',
          recall_time: new Date().toISOString(),
          recall_reason: reason || 'Recalled by player',
        })
        .eq('id', movement.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error recalling fleet:', updateError);
        return {
          success: false,
          error: 'Failed to recall fleet',
          code: 'RECALL_ERROR',
        };
      }

      return {
        success: true,
        movement: updatedMovement,
      };
    } catch (error) {
      console.error('Error recalling fleet:', error);
      return {
        success: false,
        error: 'Failed to recall fleet',
        code: 'RECALL_ERROR',
      };
    }
  }

  /**
   * Process fleet arrivals (to be called by a background job)
   */
  static async processArrivals(): Promise<void> {
    try {
      const currentTime = new Date();

      // Find all movements that should have arrived
      const { data: arrivals, error } = await supabase
        .from('fleet_movements')
        .select('*')
        .eq('status', 'travelling')
        .lte('estimated_arrival_time', currentTime.toISOString());

      if (error) {
        console.error('Error fetching fleet arrivals:', error);
        return;
      }

      for (const movement of arrivals || []) {
        await this.processArrival(movement);
      }
    } catch (error) {
      console.error('Error processing fleet arrivals:', error);
    }
  }

  /**
   * Process a single fleet arrival
   */
  private static async processArrival(movement: any): Promise<void> {
    try {
      // Update fleet location
      const { error: fleetUpdateError } = await supabase
        .from('fleets')
        .update({ location_coord: movement.destination_coord })
        .eq('id', movement.fleet_id);

      if (fleetUpdateError) {
        console.error(`Error updating fleet location for movement ${movement.id}:`, fleetUpdateError);
        return;
      }

      // Update movement status
      const { error: movementUpdateError } = await supabase
        .from('fleet_movements')
        .update({
          status: 'arrived',
          actual_arrival_time: new Date().toISOString(),
        })
        .eq('id', movement.id);

      if (movementUpdateError) {
        console.error(`Error updating movement status for ${movement.id}:`, movementUpdateError);
        return;
      }

      // Emit WebSocket event for fleet arrival
      const socket = getIO();
      if (socket) {
        socket.to(`empire:${movement.empire_id}`).emit('fleet:arrived', {
          fleetId: movement.fleet_id,
          destinationCoord: movement.destination_coord,
          arrivalTime: new Date().toISOString(),
        });
      }

      console.log(`✈️  Fleet ${movement.fleet_id} arrived at ${movement.destination_coord}`);
    } catch (error) {
      console.error(`Error processing arrival for movement ${movement.id}:`, error);
    }
  }
}
