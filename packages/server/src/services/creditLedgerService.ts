import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

// Credit transaction types
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
    empireId: string;
    amount: number; // signed
    type: CreditTxnType;
    note?: string;
    meta?: Record<string, any>;
    balanceAfter?: number;
  }): Promise<void> {
    try {
      let balanceAfter = params.balanceAfter;
      if (typeof balanceAfter !== 'number') {
        // Query empire credits from database
        const { data: empire } = await supabase
          .from(DB_TABLES.EMPIRES)
          .select(DB_FIELDS.EMPIRES.CREDITS)
          .eq(DB_FIELDS.BUILDINGS.ID, params.empireId)
          .single();

        balanceAfter = Number(empire?.credits ?? 0);
      }

      // Insert transaction record
      await supabase
        .from(DB_TABLES.CREDIT_TRANSACTIONS)
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