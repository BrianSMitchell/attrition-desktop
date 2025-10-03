import mongoose, { Schema, Document } from 'mongoose';

export interface ColonyDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  locationCoord: string;
  name: string;
  buildings: mongoose.Types.ObjectId[];
  // Citizens system
  citizens: number;
  lastCitizenUpdate?: Date;
  citizenRemainderMilli: number;
  createdAt: Date;
  updatedAt: Date;
}

const colonySchema = new Schema<ColonyDocument>(
  {
    empireId: {
      type: Schema.Types.ObjectId,
      ref: 'Empire',
      required: true,
    },
    locationCoord: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    buildings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Building',
      },
    ],
    // Citizens system defaults
    citizens: { type: Number, default: 0 },
    lastCitizenUpdate: { type: Date },
    citizenRemainderMilli: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
colonySchema.index({ empireId: 1 });
colonySchema.index({ name: 1 });

// Compound index
colonySchema.index({ empireId: 1, locationCoord: 1 });

export const Colony = mongoose.model<ColonyDocument>('Colony', colonySchema);
