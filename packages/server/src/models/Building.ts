import mongoose, { Schema, Document } from 'mongoose';

// Modern Building model for the current structures system
// This replaces the legacy building system that was removed

export interface BuildingDocument extends Document {
  _id: mongoose.Types.ObjectId;
  locationCoord: string;
  empireId: mongoose.Types.ObjectId;
  type: string; // Legacy field for compatibility
  displayName?: string;
  catalogKey?: string; // Modern field linking to shared catalog
  level: number;
  constructionStarted: Date;
  constructionCompleted?: Date;
  isActive: boolean;
  creditsCost?: number; // Modern credits-only cost
  pendingUpgrade?: boolean;
  identityKey?: string; // empireId:locationCoord:catalogKey for queue idempotency
}

const buildingSchema = new Schema<BuildingDocument>({
  locationCoord: {
    type: String,
    required: true
  },
  empireId: {
    type: Schema.Types.ObjectId,
    ref: 'Empire',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  displayName: {
    type: String
  },
  catalogKey: {
    type: String
  },
  level: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  constructionStarted: {
    type: Date,
    required: true,
    default: Date.now
  },
  constructionCompleted: {
    type: Date
  },
  isActive: {
    type: Boolean,
    required: true,
    default: false
  },
  creditsCost: {
    type: Number,
    default: 0
  },
  pendingUpgrade: {
    type: Boolean,
    default: false
  },
  identityKey: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
buildingSchema.index({ empireId: 1, locationCoord: 1 });
buildingSchema.index({ empireId: 1, isActive: 1 });
buildingSchema.index({ constructionCompleted: 1, isActive: 1 });

// Removed unique index to allow multiple instances of the same building type
// Previously prevented duplicate queued buildings with same identityKey
// Now allows unlimited queuing of same building type (multiple research labs, etc.)

export const Building = mongoose.model<BuildingDocument>('Building', buildingSchema);
