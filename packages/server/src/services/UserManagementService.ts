import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

import { GAME_CONSTANTS } from '@shared/constants/magic-numbers';
/**
 * UserManagementService - Handles user creation, validation, and profile management
 * Eliminates feature envy by centralizing user-related database operations
 */
export class UserManagementService {
  /**
   * Validate user input data
   * @param email - User's email address
   * @param username - User's username
   * @param password - User's password
   * @returns Object with normalized data or error message
   */
  static validateUserInput(email: string, username: string, password: string): { 
    isValid: boolean; 
    error?: string; 
    data?: { normEmail: string; normUsername: string; password: string; }
  } {
    const normEmail = String(email || '').trim().toLowerCase();
    const normUsername = String(username || '').trim();

    if (!normEmail || !normUsername || !password || password.length < 6) {
      return { isValid: false, error: 'Invalid registration details' };
    }

    return { 
      isValid: true, 
      data: { normEmail, normUsername, password } 
    };
  }

  /**
   * Check if user with email or username already exists
   * @param email - Email to check
   * @param username - Username to check
   * @returns Promise<boolean> - true if user exists, false otherwise
   */
  static async checkUserExists(email: string, username: string): Promise<boolean> {
    const existing = await supabase
      .from(DB_TABLES.USERS)
      .select(DB_FIELDS.BUILDINGS.ID)
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    return existing.data !== null && existing.data.length > 0;
  }

  /**
   * Create a new user with hashed password
   * @param email - User's email address
   * @param username - User's username
   * @param password - User's plain text password
   * @returns Promise<User> - Created user record
   */
  static async createUser(email: string, username: string, password: string): Promise<any> {
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // Create user row
    const userInsert = await supabase
      .from(DB_TABLES.USERS)
      .insert({ 
        email, 
        username, 
        password_hash: hashed, 
        credits: GAME_CONSTANTS.STARTING_CREDITS, 
        experience: 0 
      })
      .select('id, email, username')
      .single();

    if (userInsert.error) {
      throw userInsert.error;
    }

    return userInsert.data;
  }

  /**
   * Get user by email for login
   * @param email - Email to lookup
   * @returns Promise<User | null> - User record or null if not found
   */
  static async getUserByEmail(email: string): Promise<any | null> {
    const userQuery = await supabase
      .from(DB_TABLES.USERS)
      .select('id, email, username, password_hash, empire_id, starting_coordinate')
      .eq(DB_FIELDS.USERS.EMAIL, email)
      .maybeSingle();

    return userQuery.data;
  }

  /**
   * Verify user password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password from database
   * @returns Promise<boolean> - true if password matches
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Update user's last login timestamp
   * @param userId - User ID to update
   */
  static async updateLastLogin(userId: string): Promise<void> {
    await supabase
      .from(DB_TABLES.USERS)
      .update({ last_login: new Date().toISOString() })
      .eq(DB_FIELDS.BUILDINGS.ID, userId);
  }

  /**
   * Update user with empire association and starting coordinate
   * @param userId - User ID to update
   * @param empireId - Empire ID to associate
   * @param startingCoordinate - Starting coordinate for user
   */
  static async updateUserWithEmpire(userId: string, empireId: string, startingCoordinate: string): Promise<void> {
    await supabase
      .from(DB_TABLES.USERS)
      .update({ 
        empire_id: empireId, 
        starting_coordinate: startingCoordinate,
        last_login: new Date().toISOString() 
      })
      .eq(DB_FIELDS.BUILDINGS.ID, userId);
  }

  /**
   * Get user by ID with basic profile information
   * @param userId - User ID to lookup
   * @returns Promise<User | null> - User record or null if not found
   */
  static async getUserById(userId: string): Promise<any | null> {
    const userQuery = await supabase
      .from(DB_TABLES.USERS)
      .select('id, email, username, empire_id, starting_coordinate')
      .eq(DB_FIELDS.BUILDINGS.ID, userId)
      .maybeSingle();

    return userQuery.data;
  }
}