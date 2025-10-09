
import { supabase } from './supabase';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export { supabase };

/**
 * Database configuration - Supabase Only
 */
export const dbConfig = {
  isProduction,
  isDevelopment,
  useSupabase: true,
  useMongoDB: false,
};

/**
 * Initialize Supabase database connection
 */
export async function connectDatabase(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  DATABASE CONFIGURATION');
  console.log('═══════════════════════════════════════');
  console.log(`  Environment:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database Type:   SUPABASE`);
  console.log('═══════════════════════════════════════\n');

  await verifySupabaseConnection();
}

/**
 * Verify Supabase connection
 */
async function verifySupabaseConnection(): Promise<void> {
  try {
    // Simple query to verify connection
    const { error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = empty table, which is OK
      throw error;
    }

    console.log('✅ Connected to Supabase');
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function disconnectDatabase(): Promise<void> {
  // Supabase doesn't need explicit closing
  console.log('✅ Supabase session closed');
}

/**
 * Get current database type
 */
export function getDatabaseType(): 'supabase' {
  return 'supabase';
}
