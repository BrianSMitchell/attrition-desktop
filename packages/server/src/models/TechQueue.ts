import mongoose, { Schema, Document } from 'mongoose';
import type { TechnologyKey } from '@game/shared';

export interface TechQueueDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  locationCoord: string; // Base used for lab requirement and capacity context
  techKey: TechnologyKey;
  level: number; // Target level being researched (multi-level support)
  identityKey: string; // empireId:techKey:level for queue idempotency
  startedAt: Date;
  completesAt?: Date; // Optional until activation
  charged?: boolean; // Credits charged at activation time
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const techQueueSchema = new Schema<TechQueueDocument>(
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
    techKey: {
      type: String,
      required: true,
      enum: [
        'energy',
        'computer',
        'armour',
        'laser',
        'missiles',
        'stellar_drive',
        'plasma',
        'warp_drive',
        'shielding',
        'ion',
        'stealth',
        'photon',
        'artificial_intelligence',
        'disruptor',
        'cybernetics',
        'tachyon_communications',
        'anti_gravity',
      ],
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completesAt: {
      type: Date,
    },
    charged: {
      type: Boolean,
      required: true,
      default: false,
    },
    identityKey: {
      type: String,
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
techQueueSchema.index({ empireId: 1, techKey: 1, status: 1 });
techQueueSchema.index({ empireId: 1, techKey: 1, level: 1, status: 1 });
techQueueSchema.index({ completesAt: 1, status: 1 });

// Queue idempotency: prevent duplicate pending items with same identityKey
techQueueSchema.index(
  { identityKey: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: 'pending' } 
  }
);

export const TechQueue = mongoose.model<TechQueueDocument>('TechQueue', techQueueSchema);
