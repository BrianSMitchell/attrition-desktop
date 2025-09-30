import mongoose from 'mongoose';
import { getIO } from '../index';
import { Fleet, FleetDocument } from '../models/Fleet';
import { FleetMovement, FleetMovementDocument, MovementStatus } from '../models/FleetMovement';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
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
  movement?: FleetMovementDocument;
  error?: string;
  code?: string;
}

export interface FleetStatusResult {
  success: boolean;
  fleet?: any;
  movement?: FleetMovementDocument;
  error?: string;
}

export interface FleetRecallResult {
  success: boolean;
  movement?: FleetMovementDocument;
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
      body: parseInt(match[5], 10)
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
  static async validateDestination(destinationCoord: string, empireId: mongoose.Types.ObjectId): Promise<{ valid: boolean; error?: string }> {
    try {
      // Parse coordinate format
      this.parseCoordinate(destinationCoord);
      
      // Check if destination exists in universe
      const location = await Location.findOne({ coord: destinationCoord });
      if (!location) {
        return { valid: false, error: 'Destination does not exist in the universe' };
      }
      
      // For now, allow movement to any location
      // In the future, we could add restrictions like:
      // - Can't move to enemy-controlled systems
      // - Need certain tech levels for different regions
      // - Check for warp gates, etc.
      
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
    empireId: mongoose.Types.ObjectId,
    request: FleetDispatchRequest
  ): Promise<FleetDispatchResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the fleet
      const fleet = await Fleet.findOne({ 
        _id: fleetId, 
        empireId 
      }).session(session);

      if (!fleet) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'Fleet not found',
          code: 'FLEET_NOT_FOUND'
        };
      }

      // Check if fleet has any units
      if (!fleet.units || fleet.units.length === 0 || fleet.units.every(u => u.count === 0)) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'Fleet has no units to dispatch',
          code: 'EMPTY_FLEET'
        };
      }

      // Check if fleet is already moving
      const existingMovement = await FleetMovement.findOne({
        fleetId: fleet._id,
        status: { $in: ['pending', 'travelling'] }
      }).session(session);

      if (existingMovement) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'Fleet is already moving',
          code: 'FLEET_ALREADY_MOVING'
        };
      }

      // Validate destination
      const destinationValidation = await this.validateDestination(request.destinationCoord, empireId);
      if (!destinationValidation.valid) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: destinationValidation.error || 'Invalid destination',
          code: 'INVALID_DESTINATION'
        };
      }

      // Can't move to same location
      if (fleet.locationCoord === request.destinationCoord) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'Fleet is already at the destination',
          code: 'ALREADY_AT_DESTINATION'
        };
      }

      // Calculate movement parameters
      const distance = this.calculateDistance(fleet.locationCoord, request.destinationCoord);
      const fleetSpeed = this.calculateFleetSpeed(fleet.units);
      const travelTimeHours = this.calculateTravelTime(distance, fleetSpeed);

      const departureTime = new Date();
      const estimatedArrivalTime = new Date(departureTime.getTime() + (travelTimeHours * 60 * 60 * 1000));

      // Create movement record
      const movement = new FleetMovement({
        empireId,
        fleetId: fleet._id,
        originCoord: fleet.locationCoord,
        destinationCoord: request.destinationCoord,
        units: [...fleet.units], // Deep copy of units
        sizeCredits: fleet.sizeCredits,
        departureTime,
        estimatedArrivalTime,
        status: 'travelling',
        travelTimeHours,
        fleetSpeed,
        distance
      });

      await movement.save({ session });

      // Update fleet location to indicate it's moving (optional)
      // For now, we keep the fleet at the origin and use the movement record to track travel

      await session.commitTransaction();

      // Emit socket event for fleet movement start
      const socket = getIO();
      if (socket) {
        socket.to(`empire:${empireId}`).emit('fleet:movement', {
          fleetId: fleet._id,
          originCoord: movement.originCoord,
          destinationCoord: movement.destinationCoord,
          departureTime: movement.departureTime,
          estimatedArrivalTime: movement.estimatedArrivalTime,
          travelTimeHours: movement.travelTimeHours,
          status: movement.status
        });
      }

      return {
        success: true,
        movement
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('Error dispatching fleet:', error);
      return { 
        success: false, 
        error: 'Failed to dispatch fleet',
        code: 'DISPATCH_ERROR'
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Get fleet status including movement information
   */
  static async getFleetStatus(
    fleetId: string,
    empireId: mongoose.Types.ObjectId
  ): Promise<FleetStatusResult> {
    try {
      // Find the fleet
      const fleet = await Fleet.findOne({ 
        _id: fleetId, 
        empireId 
      });

      if (!fleet) {
        return { 
          success: false, 
          error: 'Fleet not found'
        };
      }

      // Find active movement
      const movement = await FleetMovement.findOne({
        fleetId: fleet._id,
        status: { $in: ['pending', 'travelling'] }
      });

      // Get fleet composition with unit details
      const fleetWithDetails = {
        _id: fleet._id,
        name: fleet.name,
        locationCoord: fleet.locationCoord,
        units: fleet.units.map(unit => {
          const unitSpec = getUnitSpec(unit.unitKey as any);
          return {
            unitKey: unit.unitKey,
            name: unitSpec?.name || unit.unitKey,
            count: unit.count
          };
        }),
        sizeCredits: fleet.sizeCredits,
        isMoving: !!movement,
        movement: movement ? {
          status: movement.status,
          originCoord: movement.originCoord,
          destinationCoord: movement.destinationCoord,
          departureTime: movement.departureTime,
          estimatedArrivalTime: movement.estimatedArrivalTime,
          travelTimeHours: movement.travelTimeHours,
          fleetSpeed: movement.fleetSpeed,
          distance: movement.distance
        } : null
      };

      return {
        success: true,
        fleet: fleetWithDetails,
        movement: movement || undefined
      };

    } catch (error) {
      console.error('Error getting fleet status:', error);
      return { 
        success: false, 
        error: 'Failed to get fleet status'
      };
    }
  }

  /**
   * Recall a fleet (if it hasn't arrived yet)
   */
  static async recallFleet(
    fleetId: string,
    empireId: mongoose.Types.ObjectId,
    reason?: string
  ): Promise<FleetRecallResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find active movement
      const movement = await FleetMovement.findOne({
        fleetId,
        empireId,
        status: { $in: ['pending', 'travelling'] }
      }).session(session);

      if (!movement) {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'No active movement found for this fleet',
          code: 'NO_ACTIVE_MOVEMENT'
        };
      }

      // Check if fleet has already arrived
      if (movement.status === 'arrived') {
        await session.abortTransaction();
        return { 
          success: false, 
          error: 'Fleet has already arrived and cannot be recalled',
          code: 'ALREADY_ARRIVED'
        };
      }

      // Update movement status to recalled
      movement.status = 'recalled';
      movement.recallTime = new Date();
      movement.recallReason = reason || 'Recalled by player';
      
      await movement.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        movement
      };

    } catch (error) {
      await session.abortTransaction();
      console.error('Error recalling fleet:', error);
      return { 
        success: false, 
        error: 'Failed to recall fleet',
        code: 'RECALL_ERROR'
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Process fleet arrivals (to be called by a background job)
   */
  static async processArrivals(): Promise<void> {
    try {
      const currentTime = new Date();
      
      // Find all movements that should have arrived
      const arrivals = await FleetMovement.find({
        status: 'travelling',
        estimatedArrivalTime: { $lte: currentTime }
      });

      for (const movement of arrivals) {
        await this.processArrival(movement);
      }

    } catch (error) {
      console.error('Error processing fleet arrivals:', error);
    }
  }

  /**
   * Process a single fleet arrival
   */
  private static async processArrival(movement: FleetMovementDocument): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update fleet location
      const fleet = await Fleet.findById(movement.fleetId).session(session);
      if (fleet) {
        fleet.locationCoord = movement.destinationCoord;
        await fleet.save({ session });
      }

      // Update movement status
      movement.status = 'arrived';
      movement.actualArrivalTime = new Date();
      await movement.save({ session });

      await session.commitTransaction();

      // Emit WebSocket event for fleet arrival
      const socket = getIO();
      if (socket) {
        socket.to(`empire:${movement.empireId}`).emit('fleet:arrived', {
          fleetId: movement.fleetId,
          destinationCoord: movement.destinationCoord,
          arrivalTime: movement.actualArrivalTime
        });
      }

    } catch (error) {
      await session.abortTransaction();
      console.error(`Error processing arrival for movement ${movement._id}:`, error);
    } finally {
      session.endSession();
    }
  }
}
