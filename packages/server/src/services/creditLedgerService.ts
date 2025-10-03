import { Types } from 'mongoose';
import { CreditTransaction, CreditTxnType } from '../models/CreditTransaction';
import { Empire } from '../models/Empire';

export class CreditLedgerService {
  static async logTransaction(params: {
    empireId: string | Types.ObjectId;
    amount: number; // signed
    type: CreditTxnType;
    note?: string;
    meta?: Record<string, any>;
    balanceAfter?: number;
  }): Promise<void> {
    try {
      const empireObjectId = typeof params.empireId === 'string' ? new Types.ObjectId(params.empireId) : params.empireId;
      let balanceAfter = params.balanceAfter;
      if (typeof balanceAfter !== 'number') {
        const empire = await Empire.findById(empireObjectId).select('resources.credits').lean();
        balanceAfter = Number(empire?.resources?.credits ?? 0);
      }
      await CreditTransaction.create({
        empireId: empireObjectId,
        amount: Math.round(Number(params.amount) || 0),
        type: params.type,
        note: params.note,
        meta: params.meta,
        balanceAfter,
      });
    } catch (err) {
      // Swallow logging errors so they never impact gameplay flows
      console.warn('[CreditLedger] Failed to log transaction', err);
    }
  }
}