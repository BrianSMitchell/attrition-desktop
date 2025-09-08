import mongoose, { Schema, Document } from 'mongoose';



export interface LocationDocument extends Document {
  coord: string;
  type: 'planet' | 'asteroid' | 'star';

  // Universe Overhaul: optional per-body/star computed attributes
  // For planets/asteroids (body >= 1)
  orbitPosition?: number; // 1..8
  terrain?: {
    type: string;
    baseline: {
      metal: number;
      gas: number;
      crystals: number;
      fertility: number;
      areaPlanet: number;
      
    };
  };
  positionBase?: {
    solarEnergy: number;
    fertility: number;
  };
  starApplied?: {
    solarEnergyDelta: number;
    fertilityDelta: number;
    resourceDelta: {
      metal: number;
      gas: number;
      crystals: number;
    };
  };
  result?: {
    solarEnergy: number;
    fertility: number;
    yields: {
      metal: number;
      gas: number;
      crystals: number;
    };
    area?: number;
  };

  // For stars (body 0)
  starOverhaul?: {
    kind: 'RED_GIANT' | 'SUPER_GIANT' | 'BLUE' | 'NEUTRON' | 'WHITE' | 'WHITE_DWARF' | 'ORANGE' | 'YELLOW';
    orbitModifiers: Array<{
      position: number; // 1..8
      solarEnergyDelta: number;
      fertilityDelta: number;
      resourceDelta: {
        metal: number;
        gas: number;
        crystals: number;
      };
    }>;
    notes?: string;
  };

  owner: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<LocationDocument>({
  coord: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/,
    validate: {
      validator: function(v: string) {
        // Validate coordinate format and ranges
        const match = v.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
        if (!match) return false;
        
        const galaxy = parseInt(match[2], 10);
        const region = parseInt(match[3], 10);
        const system = parseInt(match[4], 10);
        const body = parseInt(match[5], 10);
        
        return (
          galaxy >= 0 && galaxy <= 39 &&
          region >= 0 && region <= 99 &&
          system >= 0 && system <= 99 &&
          body >= 0 && body <= 19
        );
      },
      message: 'Invalid coordinate format or values out of range'
    }
  },
  type: {
    type: String,
    required: true,
    enum: ['planet', 'asteroid', 'star']
  },

  // Universe Overhaul: optional per-body computed attributes for non-stars
  orbitPosition: {
    type: Number,
    min: 1,
    max: 8
  },
  terrain: {
    type: new Schema(
      {
        type: { type: String, required: true },
        baseline: {
          metal: { type: Number, required: true },
          gas: { type: Number, required: true },
          crystals: { type: Number, required: true },
          fertility: { type: Number, required: true },
          areaPlanet: { type: Number },
          areaMoon: { type: Number }
        }
      },
      { _id: false }
    ),
    required: function (this: any) {
      return this.type !== 'star';
    }
  },
  positionBase: {
    type: new Schema(
      {
        solarEnergy: { type: Number, required: true },
        fertility: { type: Number, required: true }
      },
      { _id: false }
    )
  },
  starApplied: {
    type: new Schema(
      {
        solarEnergyDelta: { type: Number, required: true },
        fertilityDelta: { type: Number, required: true },
        resourceDelta: {
          metal: { type: Number, default: 0 },
          gas: { type: Number, default: 0 },
          crystals: { type: Number, default: 0 }
        }
      },
      { _id: false }
    )
  },
  result: {
    type: new Schema(
      {
        solarEnergy: { type: Number, required: true },
        fertility: { type: Number, required: true },
        yields: {
          metal: { type: Number, required: true },
          gas: { type: Number, required: true },
          crystals: { type: Number, required: true }
        },
        area: { type: Number }
      },
      { _id: false }
    )
  },

  // Universe Overhaul: per-star modifiers (body 0)
  starOverhaul: {
    type: new Schema(
      {
        kind: {
          type: String,
          enum: ['RED_GIANT','SUPER_GIANT','BLUE','NEUTRON','WHITE','WHITE_DWARF','ORANGE','YELLOW'],
          required: true
        },
        orbitModifiers: {
          type: [
            new Schema(
              {
                position: { type: Number, required: true, min: 1, max: 8 },
                solarEnergyDelta: { type: Number, required: true },
                fertilityDelta: { type: Number, required: true },
                resourceDelta: {
                  metal: { type: Number, default: 0 },
                  gas: { type: Number, default: 0 },
                  crystals: { type: Number, default: 0 }
                }
              },
              { _id: false }
            )
          ],
          required: true
        },
        notes: { type: String }
      },
      { _id: false }
    ),
    required: function (this: any) {
      return this.type === 'star';
    }
  },

  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
locationSchema.index({ owner: 1 });
locationSchema.index({ type: 1 });

// Compound indexes for common query patterns
locationSchema.index({ owner: 1, type: 1 });

export const Location = mongoose.model<LocationDocument>('Location', locationSchema);
