import mongoose, { Schema, Document } from 'mongoose';
import type { UnitKey } from '@game/shared';

export type MovementStatus = 'pending' | 'travelling' | 'arrived' | 'recalled' | 'failed';

export interface FleetUnit {
  unitKey: UnitKey;
  count: number;
}

export interface FleetMovementDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  fleetId: mongoose.Types.ObjectId;
  
  // Movement details
  originCoord: string; // Starting coordinate
  destinationCoord: string; // Target coordinate
  
  // Movement composition - snapshot of units at dispatch time
  units: FleetUnit[];
  sizeCredits: number; // Total fleet value
  
  // Movement timing
  departureTime: Date; // When the fleet left origin
  estimatedArrivalTime: Date; // When the fleet should arrive
  actualArrivalTime?: Date; // When the fleet actually arrived (if arrived)
  
  // Movement status
  status: MovementStatus;
  
  // Movement metadata
  travelTimeHours: number; // Total travel time in hours
  fleetSpeed: number; // Fleet speed (determined by slowest unit)
  distance: number; // Distance between coordinates
  
  // Optional recall information
  recallTime?: Date; // When recall was initiated
  recallReason?: string; // Why the movement was recalled
  
  // Error handling
  errorMessage?: string; // If status is 'failed', reason for failure
  
  createdAt: Date;
  updatedAt: Date;
}

const coordinateRegex = /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/;

const fleetUnitSchema = new Schema<FleetUnit>(
  {
    unitKey: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const fleetMovementSchema = new Schema<FleetMovementDocument>(
  {
    empireId: {
      type: Schema.Types.ObjectId,
      ref: 'Empire',
      required: true,
      index: true,
    },
    fleetId: {
      type: Schema.Types.ObjectId,
      ref: 'Fleet',
      required: true,
      index: true,
    },
    originCoord: {
      type: String,
      required: true,
      match: coordinateRegex,
      index: true,
    },
    destinationCoord: {
      type: String,
      required: true,
      match: coordinateRegex,
      index: true,
    },
    units: {
      type: [fleetUnitSchema],
      required: true,
      default: [],
    },
    sizeCredits: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    departureTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    estimatedArrivalTime: {
      type: Date,
      required: true,
    },
    actualArrivalTime: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'travelling', 'arrived', 'recalled', 'failed'],
      default: 'pending',
      index: true,
    },
    travelTimeHours: {
      type: Number,
      required: true,
      min: 0,
    },
    fleetSpeed: {
      type: Number,
      required: true,
      min: 0,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    recallTime: {
      type: Date,
      required: false,
    },
    recallReason: {
      type: String,
      required: false,
      maxlength: 500,
    },
    errorMessage: {
      type: String,
      required: false,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes
fleetMovementSchema.index({ empireId: 1, status: 1 });
fleetMovementSchema.index({ fleetId: 1, status: 1 });
fleetMovementSchema.index({ status: 1, estimatedArrivalTime: 1 }); // For processing arrivals
fleetMovementSchema.index({ departureTime: 1 });
// Note: originCoord and destinationCoord indexes are already defined at field level (index: true)

// Compound index for finding active movements
fleetMovementSchema.index({ 
  empireId: 1, 
  status: 1, 
  estimatedArrivalTime: 1 
});

export const FleetMovement = mongoose.model<FleetMovementDocument>('FleetMovement', fleetMovementSchema);
