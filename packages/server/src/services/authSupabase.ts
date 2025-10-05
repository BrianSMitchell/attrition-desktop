import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';

// Helpers re-used from existing middleware
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

// Utility: unwrap Supabase results or throw
function assertNoError<T>(res: { data: T | null; error: any }): T {
  if (res.error) {
    throw res.error;
  }
  return res.data as T;
}

export async function registerSupabase(req: Request, res: Response) {
  const { email, username, password } = req.body as { email: string; username: string; password: string };

  const normEmail = String(email || '').trim().toLowerCase();
  const normUsername = String(username || '').trim();

  if (!normEmail || !normUsername || !password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Invalid registration details' });
  }

  try {
    // Uniqueness check
    const existing = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${normEmail},username.eq.${normUsername}`)
      .limit(1);

    if ((existing.data && existing.data.length > 0) || existing.error) {
      if (existing.error) throw existing.error;
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(password, salt);

    // Create user row
    const userInsert = await supabase
      .from('users')
      .insert({ email: normEmail, username: normUsername, password_hash: hashed, credits: 100, experience: 0 })
      .select('id')
      .single();

    const userRow = assertNoError(userInsert);
    const userId: string = userRow.id;

    // Find a starter planet
    const candidate = await supabase
      .from('locations')
      .select('coord')
      .eq('type', 'planet')
      .is('owner_id', null)
      .limit(1)
      .single();

    const starter = candidate.data?.coord as string | undefined;
    if (!starter) {
      return res.status(503).json({ success: false, error: 'No starter planets available' });
    }

    // Attempt to claim atomically (update only if owner_id is null)
    const claim = await supabase
      .from('locations')
      .update({ owner_id: userId })
      .eq('coord', starter)
      .is('owner_id', null)
      .select('coord')
      .single();

    if (!claim.data) {
      return res.status(503).json({ success: false, error: 'Failed to claim starter planet, please retry' });
    }

    // Create empire
    const empireInsert = await supabase
      .from('empires')
      .insert({
        user_id: userId,
        name: normUsername,
        home_system: starter,
        territories: [starter],
        credits: 100,
        energy: 0,
      })
      .select('id, name, home_system')
      .single();

    const empireRow = assertNoError(empireInsert);

    // Create colony
    await supabase
      .from('colonies')
      .insert({ empire_id: empireRow.id, location_coord: starter, name: 'Home Base' });

    // Add starter building
    await supabase
      .from('buildings')
      .insert({
        location_coord: starter,
        empire_id: empireRow.id,
        type: 'habitat',
        display_name: 'Urban Structures',
        catalog_key: 'urban_structures',
        level: 1,
        construction_completed: new Date().toISOString(),
        is_active: true,
        credits_cost: 0,
      });

    // Update user with empire and starting coordinate
    await supabase
      .from('users')
      .update({ empire_id: empireRow.id, starting_coordinate: starter, last_login: new Date().toISOString() })
      .eq('id', userId);

    // Tokens (reuse existing helpers)
    const accessToken = generateAccessToken(userId, req);
    const refreshToken = generateRefreshToken(userId);

    // Return a minimal user object compatible with client
    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, email: normEmail, username: normUsername, gameProfile: { startingCoordinate: starter, empireId: empireRow.id } },
        token: accessToken,
        refreshToken,
        empire: { id: empireRow.id, name: empireRow.name, homeSystem: empireRow.home_system },
      },
      message: 'User registered successfully',
    });
  } catch (err: any) {
    console.error('[authSupabase.register] failed:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

export async function loginSupabase(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const lookupEmail = String(email || '').trim().toLowerCase();

  if (!lookupEmail || !password) {
    return res.status(400).json({ success: false, error: 'Invalid login' });
  }

  try {
    const userQuery = await supabase
      .from('users')
      .select('id, email, username, password_hash, empire_id, starting_coordinate')
      .eq('email', lookupEmail)
      .single();

    if (userQuery.error || !userQuery.data) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const userRow = userQuery.data as any;
    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Update last_login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', userRow.id);

    const token = generateAccessToken(userRow.id, req);
    const refreshToken = generateRefreshToken(userRow.id);

    res.json({
      success: true,
      data: {
        user: {
          id: userRow.id,
          email: userRow.email,
          username: userRow.username,
          gameProfile: {
            startingCoordinate: userRow.starting_coordinate || null,
            empireId: userRow.empire_id || null,
          },
        },
        token,
        refreshToken,
      },
    });
  } catch (err: any) {
    console.error('[authSupabase.login] failed:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}