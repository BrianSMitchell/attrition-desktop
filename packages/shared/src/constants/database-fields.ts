/**
 * Shared Database Field Constants
 * 
 * Common database field names used across packages.
 * This prevents cross-package dependencies while maintaining consistent field naming.
 */

export const DB_FIELDS = {
  // Empires table fields (shared across client and server)
  EMPIRES: {
    ID: 'id',
    USER_ID: 'user_id', 
    NAME: 'name',
    HOME_SYSTEM: 'home_system',
    TERRITORIES: 'territories',
    CREDITS: 'credits',
    ENERGY: 'energy',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  }
} as const;

/**
 * Type definitions for database fields
 */
export type EmpireField = typeof DB_FIELDS.EMPIRES[keyof typeof DB_FIELDS.EMPIRES];