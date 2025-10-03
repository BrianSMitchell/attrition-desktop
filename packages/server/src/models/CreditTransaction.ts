import mongoose, { Schema, Document } from 'mongoose';

export type CreditTxnType =
  | 'payout'          // periodic credits payout (income)
  | 'construction'    // structure construction charge
  | 'construction_refund' // structure cancel/refund
  | 'research'        // research charge
  | 'research_refund' // research cancel/refund
  | 'unit_production' // units production charge
  | 'colonization'    // colonization cost
  | 'other';          // fallback type

export interface CreditTransactionDocument extends Document {
  empireId: mongoose.Types.ObjectId;
  amount: number; // signed: +income, -spend
  balanceAfter?: number; // optional snapshot for convenience
  type: CreditTxnType;
  note?: string;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema = new Schema<CreditTransactionDocument>(
  {
    empireId: { type: Schema.Types.ObjectId, ref: 'Empire', required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    type: { type: String, required: true },
    note: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

creditTransactionSchema.index({ empireId: 1, createdAt: -1 });

export const CreditTransaction = mongoose.model<CreditTransactionDocument>(
  'CreditTransaction',
  creditTransactionSchema
);