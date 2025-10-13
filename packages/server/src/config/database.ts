import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { DB_TABLES } from '../constants/database-fields';
import { ENV_VARS } from '@shared/constants/env-vars';
import { ENV_VALUES } from '@shared/constants/configuration-keys';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env[ENV_VARS.SUPABASE_URL]!;
const supabaseKey = process.env[ENV_VARS.SUPABASE_ANON_KEY]!;
export const supabase = createClient(supabaseUrl, supabaseKey);

const isProduction = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION;
const isDevelopment = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT;
const isProduction = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION;
const isDevelopment = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT;

/**
 * Database configuration
 */
export const dbConfig = {
  isProduction,
  isDevelopment,
};

/**
 * Initialize database connection
 */
export async function connectDatabase(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  DATABASE CONFIGURATION');
  console.log('═══════════════════════════════════════');
  console.log(`  Environment:     ${process.env[ENV_VARS.NODE_ENV] || 'development'}`);
  console.log('═══════════════════════════════════════\n');

  await verifyDatabaseConnection();
}

/**
 * Verify database connection
 */
async function verifyDatabaseConnection(): Promise<void> {
  try {
    // Simple query to verify connection
    const { error } = await supabase.from(DB_TABLES.USERS).select('count').limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = empty table, which is OK
      throw error;
    }

    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function disconnectDatabase(): Promise<void> {
  // Database client handles cleanup automatically
  console.log('✅ Database session closed');
}

