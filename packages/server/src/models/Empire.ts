import mongoose, { Schema, Document } from 'mongoose';


export interface EmpireResources {
  credits: number;
  energy: number;
}

export interface EmpireDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  homeSystem?: string; // coordinate like A00:10:22:10
  territories: string[]; // list of coordinates
  baseCount: number; // Track number of bases for colonization cost calculation
  hasDeletedBase: boolean; // Track if empire gets 25% colonization discount
  economyPerHour: number; // Cached total empire economy (sum of all bases)
  resources: EmpireResources;
  lastResourceUpdate?: Date;
  lastCreditPayout?: Date;
  creditsRemainderMilli: number;
  techLevels?: Map<string, number>; // stored as Mongo Map
  nextFleetNumber?: number; // auto-increment for fleet naming
  createdAt: Date;
  updatedAt: Date;
}

const coordinateRegex = /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/;

const empireSchema = new Schema<EmpireDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    homeSystem: {
      type: String,
      match: coordinateRegex,
      required: false,
    },
  territories: {
    type: [String],
    default: [],
  },
  baseCount: {
    type: Number,
    default: 0,
  },
  hasDeletedBase: {
    type: Boolean,
    default: false,
  },
  economyPerHour: {
    type: Number,
    default: 0,
  },
  resources: {
    credits: { type: Number, default: 0 },
    energy: { type: Number, default: 0 },
  },
    lastResourceUpdate: {
      type: Date,
      required: false,
    },
    lastCreditPayout: {
      type: Date,
      required: false,
    },
    creditsRemainderMilli: {
      type: Number,
      default: 0,
    },
    nextFleetNumber: {
      type: Number,
      default: 1,
    },
    // Map of TechnologyKey -> level
    techLevels: {
      type: Map,
      of: Number,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes
empireSchema.index({ userId: 1 });
empireSchema.index({ name: 1 });
empireSchema.index({ 'resources.credits': -1 });

export const Empire = mongoose.model<EmpireDocument>('Empire', empireSchema);
