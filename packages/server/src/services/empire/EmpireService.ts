import { DB_TABLES } from '../constants/database-fields';
import { ERROR_MESSAGES } from '../../constants/response-formats';

import { DB_FIELDS } from '../../../constants/database-fields';
import { supabase } from '../config/supabase';
interface CreditTransaction {
  _id: string;
  amount: number;
  type: string;
  note: string | null;
  balanceAfter: number | null;
  createdAt: string;
}

interface CreditHistoryOptions {
  limit?: number;
}

export class EmpireService {
  /**
   * Get credit transaction history for an empire
   */
  static async getCreditHistory(
    user: any, 
    options: CreditHistoryOptions = {}
  ): Promise<CreditTransaction[]> {
    // Apply limits and constraints
    const limit = Math.min(Math.max(1, options.limit || 50), 200);

    // Resolve empire
    const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
    if (!empireRow) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const empireId = String(empireRow.id);

    // Fetch credit transactions
    const { data: txns, error } = await supabase
      .from(DB_TABLES.CREDIT_TRANSACTIONS)
      .select('id, amount, type, note, balance_after, created_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching credit history:', error);
      throw new Error('Failed to fetch credit history');
    }

    return (txns || []).map(t => ({
      _id: t.id,
      amount: t.amount,
      type: t.type,
      note: t.note || null,
      balanceAfter: typeof t.balance_after === 'number' ? t.balance_after : null,
      createdAt: t.created_at,
    }));
  }

  /**
   * Get complete empire details including resources and production rates
   */
  static async getEmpireDetails(user: any) {
    const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
    if (!empireRow) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    return {
      empire: {
        id: empireRow.id,
        name: empireRow.name,
        territories: Array.isArray(empireRow.territories) ? empireRow.territories : [],
        resources: {
          credits: Math.max(0, Number(empireRow.credits || 0)),
          energy: Math.max(0, Number(empireRow.energy || 0)),
        },
      },
      creditsPerHour: 0, // To be implemented with production calculation
      resourcesGained: 0, // To be implemented with resource tracking
    };
  }
}



