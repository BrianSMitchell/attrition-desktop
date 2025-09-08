// Validation schemas using Zod

import { z } from 'zod';

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
});

// Coordinate validation
export const coordinateSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0)
});

// Empire validation schemas
export const empireCreationSchema = z.object({
  name: z.string()
    .min(3, 'Empire name must be at least 3 characters')
    .max(30, 'Empire name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Empire name can only contain letters, numbers, and spaces')
});

export const empireUpdateSchema = z.object({
  name: z.string()
    .min(3, 'Empire name must be at least 3 characters')
    .max(30, 'Empire name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Empire name can only contain letters, numbers, and spaces')
    .optional()
});

// Fleet validation schemas
export const fleetCreationSchema = z.object({
  name: z.string()
    .min(3, 'Fleet name must be at least 3 characters')
    .max(20, 'Fleet name must be less than 20 characters'),
  systemId: z.string().min(1, 'System ID is required')
});

export const fleetMoveSchema = z.object({
  fleetId: z.string().min(1, 'Fleet ID is required'),
  destination: coordinateSchema
});

// Game action validation
export const gameActionSchema = z.object({
  type: z.string().min(1, 'Action type is required'),
  payload: z.any(),
  empireId: z.string().min(1, 'Empire ID is required')
});

// Universe settings validation
export const universeSettingsSchema = z.object({
  maxPlayers: z.number().int().min(2).max(1000),
  gameSpeed: z.number().min(0.1).max(10),
  startingResources: z.object({
    credits: z.number().int().min(0),
    minerals: z.number().int().min(0),
    energy: z.number().int().min(0)
  })
});

// Planet validation
export const planetSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['terrestrial', 'gas_giant', 'ice', 'desert', 'volcanic']),
  size: z.enum(['small', 'medium', 'large']),
  population: z.number().int().min(0),
  infrastructure: z.object({
    mines: z.number().int().min(0),
    factories: z.number().int().min(0),
    research_labs: z.number().int().min(0),
    defense_stations: z.number().int().min(0)
  }),
  resources: z.object({
    minerals: z.number().int().min(0),
    energy: z.number().int().min(0)
  })
});

// Star system validation
export const starSystemSchema = z.object({
  name: z.string().min(1).max(50),
  coordinates: coordinateSchema,
  planets: z.array(planetSchema),
  owner: z.string().optional(),
  resources: z.object({
    minerals: z.number().int().min(0),
    energy: z.number().int().min(0)
  }),
  defenseLevel: z.number().int().min(0)
});

// Ship validation
export const shipSchema = z.object({
  type: z.enum(['scout', 'fighter', 'cruiser', 'battleship', 'transport']),
  health: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  attack: z.number().int().min(0),
  defense: z.number().int().min(0),
  speed: z.number().min(0),
  cargo: z.object({
    minerals: z.number().int().min(0),
    energy: z.number().int().min(0),
    capacity: z.number().int().min(0)
  }).optional()
});

// Validation helper functions
export function validateLogin(data: unknown) {
  return loginSchema.safeParse(data);
}

export function validateRegister(data: unknown) {
  return registerSchema.safeParse(data);
}

export function validateCoordinates(data: unknown) {
  return coordinateSchema.safeParse(data);
}

export function validateEmpireCreation(data: unknown) {
  return empireCreationSchema.safeParse(data);
}

export function validateFleetCreation(data: unknown) {
  return fleetCreationSchema.safeParse(data);
}

export function validateFleetMove(data: unknown) {
  return fleetMoveSchema.safeParse(data);
}

export function validateGameAction(data: unknown) {
  return gameActionSchema.safeParse(data);
}

// Type exports for use in other packages
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type CoordinateData = z.infer<typeof coordinateSchema>;
export type EmpireCreationData = z.infer<typeof empireCreationSchema>;
export type FleetCreationData = z.infer<typeof fleetCreationSchema>;
export type FleetMoveData = z.infer<typeof fleetMoveSchema>;
export type GameActionData = z.infer<typeof gameActionSchema>;

/* ============================================
 * Desktop cache validation & normalization (Phase 4)
 * ============================================
 * These helpers validate and normalize bootstrap payloads and cached content
 * so the Electron app can safely persist and read catalogs/profile data.
 */

// Catalog entry: preferred form used by desktop cache
export const CatalogEntrySchema = z.object({
  data: z.unknown(),
  version: z.string().optional(),
  contentHash: z.string().optional()
});
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;

// Catalogs container: keys are optional to allow partial caching
export const CatalogsSchema = z.object({
  technologies: z.unknown().optional(),
  buildings: z.unknown().optional(),
  defenses: z.unknown().optional(),
  units: z.unknown().optional()
});

// Server-side profile snapshot (from /sync/bootstrap)
export const ProfileSnapshotServerSchema = z.object({
  user: z.object({
    _id: z.any(),
    username: z.string(),
    email: z.string().email()
  }).passthrough(),
  empire: z.any(),
  profile: z.object({
    economyPerHour: z.number(),
    fleetScore: z.number(),
    technologyScore: z.number(),
    level: z.number()
  }).passthrough(),
  // Allow additional fields like lastResourceUpdate, creditsPerHour, serverInfo
}).passthrough();

// Desktop cache profile entry (normalized form)
export const ProfileCacheEntrySchema = z.object({
  userId: z.string(),
  deviceId: z.string(),
  data: z.unknown(),
  schemaVersion: z.number().int().min(1).optional()
});
export type ProfileCacheEntry = z.infer<typeof ProfileCacheEntrySchema>;

// Version payload is flexible server-side; desktop normalizes to a string
export const BootstrapVersionSchema = z.object({
  catalogs: z.string().optional(),
  profile: z.string().optional(),
  timestamp: z.string().optional()
}).optional();

/**
 * Normalize any catalog value into a CatalogEntry shape.
 * - If already in { data, version?, contentHash? } form, validate and return.
 * - Otherwise, wrap raw value as { data: raw, version?: defaultVersion }.
 */
export function parseCatalogEntry(value: unknown, defaultVersion?: string): CatalogEntry {
  if (value && typeof value === 'object' && ('data' in (value as any))) {
    const parsed = CatalogEntrySchema.safeParse(value);
    if (parsed.success) return parsed.data;
    // Fall through to wrapping if validation failed
  }
  return {
    data: value,
    version: defaultVersion
  };
}

/**
 * Validate and normalize a catalogs object, wrapping each present catalog
 * into a CatalogEntry shape.
 */
export function normalizeCatalogs(input: unknown, defaultVersion?: string): Record<string, CatalogEntry> {
  const parsed = CatalogsSchema.safeParse(input);
  if (!parsed.success) {
    throw parsed.error;
  }
  const src = parsed.data;
  const out: Record<string, CatalogEntry> = {};
  for (const key of ['technologies', 'buildings', 'defenses', 'units'] as const) {
    if (key in src && (src as any)[key] !== undefined) {
      out[key] = parseCatalogEntry((src as any)[key], defaultVersion);
    }
  }
  return out;
}

/**
 * Convert a server ProfileSnapshot into a desktop ProfileCacheEntry.
 */
export function fromServerProfileSnapshot(snap: unknown, deviceId: string): ProfileCacheEntry {
  const parsed = ProfileSnapshotServerSchema.safeParse(snap);
  if (!parsed.success) {
    throw parsed.error;
  }
  const userId = String((parsed.data.user as any)._id);
  return {
    userId,
    deviceId,
    data: parsed.data,
    schemaVersion: 1
  };
}

/**
 * Parse and normalize the /sync/bootstrap payload into desktop-friendly shapes.
 * Accepts either:
 * - Desktop-expected: { version, catalogs: { key: CatalogEntry|raw }, profile: ProfileCacheEntry }
 * - Server form:      { version, catalogs: raw arrays/objects, profileSnapshot: ServerSnapshot }
 */
export function parseAndNormalizeBootstrap(
  input: unknown,
  opts?: { deviceId?: string; fallbackVersion?: string }
): {
  version: string;
  catalogs?: Record<string, CatalogEntry>;
  profile?: ProfileCacheEntry;
} {
  if (!input || typeof input !== 'object') {
    throw new Error('Bootstrap payload must be an object');
  }

  const obj: any = input;

  // Determine version string
  // Prefer server version.catalogs, else version string, else fallback
  const versionValue =
    (obj?.version && typeof obj.version === 'object' && typeof obj.version.catalogs === 'string'
      ? obj.version.catalogs
      : (typeof obj.version === 'string' ? obj.version : undefined))
    || opts?.fallbackVersion
    || '1.0.0';

  // Catalogs (tolerate both desktop and server shapes)
  let catalogs: Record<string, CatalogEntry> | undefined = undefined;
  if (obj?.catalogs) {
    catalogs = normalizeCatalogs(obj.catalogs, versionValue);
  }

  // Profile (tolerate desktop 'profile' or server 'profileSnapshot')
  let profile: ProfileCacheEntry | undefined = undefined;

  if (obj?.profile) {
    const p = ProfileCacheEntrySchema.safeParse(obj.profile);
    if (!p.success) {
      throw p.error;
    }
    profile = p.data;
  } else if (obj?.profileSnapshot) {
    const deviceId = opts?.deviceId || 'unknown-device';
    profile = fromServerProfileSnapshot(obj.profileSnapshot, deviceId);
  }

  return {
    version: String(versionValue),
    catalogs,
    profile
  };
}
