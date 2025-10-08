import { supabase } from '../config/supabase';
import { getDatabaseType } from '../config/database';

// Credit transaction types - migrated from MongoDB model
export type CreditTxnType =
  | 'payout'          // periodic credits payout (income)
  | 'construction'    // structure construction charge
  | 'construction_refund' // structure cancel/refund
  | 'research'        // research charge
  | 'research_refund' // research cancel/refund
  | 'unit_production' // units production charge
  | 'colonization'    // colonization cost
  | 'other';          // fallback type

export class CreditLedgerService {
  static async logTransaction(params: {
    empireId: string; // Now using UUID strings instead of MongoDB ObjectId
    amount: number; // signed
    type: CreditTxnType;
    note?: string;
    meta?: Record<string, any>;
    balanceAfter?: number;
  }): Promise<void> {
    try {
      let balanceAfter = params.balanceAfter;
      if (typeof balanceAfter !== 'number') {
        // Query empire credits using Supabase instead of MongoDB
        const { data: empire } = await supabase
          .from('empires')
          .select('credits')
          .eq('id', params.empireId)
          .single();

        balanceAfter = Number(empire?.credits ?? 0);
      }

      // Insert transaction record using Supabase instead of MongoDB
      await supabase
        .from('credit_transactions')
        .insert({
          empire_id: params.empireId,
          amount: Math.round(Number(params.amount) || 0),
          type: params.type,
          note: params.note,
          meta: params.meta,
          balance_after: balanceAfter,
        });
    } catch (err) {
      // Swallow logging errors so they never impact gameplay flows
      console.warn('[CreditLedger] Failed to log transaction', err);
    }
  }
}