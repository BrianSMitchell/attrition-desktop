import mongoose, { Schema, Document } from 'mongoose';
import type { UnitKey } from '@game/shared';

export interface UnitQueueDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  locationCoord: string; // Base used for shipyard requirement and capacity context
  unitKey: UnitKey;
  identityKey: string; // Unique identity for idempotency: ${empireId}:${locationCoord}:${unitKey}
  startedAt: Date;
  completesAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const unitQueueSchema = new Schema<UnitQueueDocument>(
  {
    empireId: {
      type: Schema.Types.ObjectId,
      ref: 'Empire',
      required: true,
    },
    locationCoord: {
      type: String,
      required: true,
      match: /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/,
    },
    unitKey: {
      type: String,
      required: true,
      enum: [
        'fighter',
        'bomber',
        'heavy_bomber',
        'ion_bomber',
        'corvette',
        'recycler',
        'destroyer',
        'frigate',
        'ion_frigate',
        'scout_ship',
        'outpost_ship',
        'cruiser',
        'carrier',
        'heavy_cruiser',
        'battleship',
        'fleet_carrier',
        'dreadnought',
        'titan',
        'leviathan',
        'death_star',
      ],
    },
    identityKey: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completesAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes
unitQueueSchema.index({ empireId: 1, unitKey: 1, status: 1 });
unitQueueSchema.index({ completesAt: 1, status: 1 });
unitQueueSchema.index({ locationCoord: 1, status: 1 });

// Unique index to prevent duplicate pending items (idempotency guard)
unitQueueSchema.index(
  { identityKey: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const UnitQueue = mongoose.model<UnitQueueDocument>('UnitQueue', unitQueueSchema);
