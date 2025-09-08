import mongoose, { Schema, Document } from 'mongoose';
import type { UnitKey } from '@game/shared';

export interface FleetUnit {
  unitKey: UnitKey;
  count: number;
}

export interface FleetDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  locationCoord: string; // Base coordinate where the fleet is stationed
  name: string; // e.g., "Fleet 1"
  units: FleetUnit[]; // composition by unitKey
  sizeCredits: number; // Σ(count * getUnitSpec(unitKey).creditsCost)
  createdAt: Date;
  updatedAt: Date;
}

const coordinateRegex = /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/;

const fleetUnitSchema = new Schema<FleetUnit>(
  {
    unitKey: {
      type: String,
      required: true,
      // UnitKey enum lives in @game/shared; store string key here
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

const fleetSchema = new Schema<FleetDocument>(
  {
    empireId: {
      type: Schema.Types.ObjectId,
      ref: 'Empire',
      required: true,
      index: true,
    },
    locationCoord: {
      type: String,
      required: true,
      match: coordinateRegex,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    units: {
      type: [fleetUnitSchema],
      default: [],
    },
    sizeCredits: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes
fleetSchema.index({ empireId: 1, locationCoord: 1 });
fleetSchema.index({ empireId: 1, name: 1 });

export const Fleet = mongoose.model<FleetDocument>('Fleet', fleetSchema);
