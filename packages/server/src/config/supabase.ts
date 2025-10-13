import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ENV_VARS } from '@shared/constants/env-vars';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env[ENV_VARS.SUPABASE_URL];
const supabaseServiceKey = process.env[ENV_VARS.SUPABASE_SERVICE_ROLE_KEY];

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single Supabase client for the server with service role key
// This bypasses Row Level Security and should only be used server-side
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, operation: string): never {
  console.error(`Supabase error during ${operation}:`, error);
  throw new Error(`Database operation failed: ${operation}`);
}

// Type helper for database operations
export type DbResult<T> = {
  data: T | null;
  error: any | null;
};
