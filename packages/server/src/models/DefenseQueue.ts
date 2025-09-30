import mongoose, { Schema, Document } from 'mongoose';

export interface DefenseQueueDocument extends Document {
  _id: mongoose.Types.ObjectId;
  empireId: mongoose.Types.ObjectId;
  locationCoord: string;
  defenseKey: string;
  status: 'pending' | 'completed' | 'cancelled';
  startedAt?: Date | null;
  completesAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<DefenseQueueDocument>({
  empireId: { type: Schema.Types.ObjectId, ref: 'Empire', required: true, index: true },
  locationCoord: { type: String, required: true, index: true },
  defenseKey: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], required: true, default: 'pending', index: true },
  startedAt: { type: Date },
  completesAt: { type: Date },
}, { timestamps: true });

schema.index({ empireId: 1, locationCoord: 1, status: 1 });

export const DefenseQueue = mongoose.model<DefenseQueueDocument>('DefenseQueue', schema);