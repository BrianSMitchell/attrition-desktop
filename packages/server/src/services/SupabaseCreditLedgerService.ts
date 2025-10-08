import { supabase } from '../config/supabase';

export interface CreditTransaction {
  id?: string;
  empire_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at?: string;
  metadata?: any;
}

export class SupabaseCreditLedgerService {
  /**
   * Add credits to an empire
   */
  static async addCredits(
    empireId: string,
    amount: number,
    transactionType: string,
    description: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .insert({
        empire_id: empireId,
        amount,
        transaction_type: transactionType,
        description,
        metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add credits: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove credits from an empire
   */
  static async removeCredits(
    empireId: string,
    amount: number,
    transactionType: string,
    description: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    return this.addCredits(empireId, -amount, transactionType, description, metadata);
  }

  /**
   * Get credit transaction history for an empire
   */
  static async getTransactionHistory(
    empireId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('empire_id', empireId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get current credit balance for an empire
   */
  static async getCurrentBalance(empireId: string): Promise<number> {
    const { data, error } = await supabase
      .from('empires')
      .select('credits')
      .eq('id', empireId)
      .single();

    if (error) {
      throw new Error(`Failed to get current balance: ${error.message}`);
    }

    return data?.credits || 0;
  }

  /**
   * Update empire credits (for atomic operations)
   */
  static async updateEmpireCredits(empireId: string, newBalance: number): Promise<void> {
    const { error } = await supabase
      .from('empires')
      .update({ credits: newBalance })
      .eq('id', empireId);

    if (error) {
      throw new Error(`Failed to update empire credits: ${error.message}`);
    }
  }

  /**
   * Log a credit transaction (alias for addCredits for backward compatibility)
   */
  static async logTransaction(
    empireId: string,
    amount: number,
    transactionType: string,
    description: string,
    metadata?: any
  ): Promise<CreditTransaction> {
    return this.addCredits(empireId, amount, transactionType, description, metadata);
  }
}