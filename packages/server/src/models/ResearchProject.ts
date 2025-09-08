import mongoose, { Schema, Document } from 'mongoose';

export interface ResearchProjectDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  type: 'military' | 'economic' | 'exploration';
  name: string;
  description: string;
  researchCost: number;
  researchProgress: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  benefits: {
    resourceBonus?: {
      creditsPerHour?: number;
    };
    buildingUnlock?: string[];
    shipUnlock?: string[];
    other?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const researchProjectSchema = new Schema<ResearchProjectDocument>({
  empireId: {
    type: Schema.Types.ObjectId,
    ref: 'Empire',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['military', 'economic', 'exploration']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  researchCost: {
    type: Number,
    required: true,
    min: 1
  },
  researchProgress: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    required: true,
    default: false
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  benefits: {
    resourceBonus: {
      creditsPerHour: {
        type: Number,
        min: 0
      }
    },
    buildingUnlock: [{
      type: String,
      enum: ['mine', 'factory', 'research_lab', 'defense_station', 'shipyard', 'command_center', 'solar_array', 'habitat']
    }],
    shipUnlock: [{
      type: String
    }],
    other: [{
      type: String
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
researchProjectSchema.index({ empireId: 1 });
researchProjectSchema.index({ type: 1 });
researchProjectSchema.index({ isCompleted: 1 });
researchProjectSchema.index({ startedAt: 1 });

// Compound indexes
researchProjectSchema.index({ empireId: 1, type: 1 });
researchProjectSchema.index({ empireId: 1, isCompleted: 1 });

// Validation to ensure progress doesn't exceed cost
researchProjectSchema.pre('save', function(next) {
  if (this.researchProgress >= this.researchCost && !this.isCompleted) {
    this.isCompleted = true;
    this.completedAt = new Date();
  }
  next();
});

export const ResearchProject = mongoose.model<ResearchProjectDocument>('ResearchProject', researchProjectSchema);
