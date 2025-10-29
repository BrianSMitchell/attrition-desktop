"use strict";
// Validation schemas using Zod
Object.defineProperty(exports, "__esModule", { value: true });
exports.BootstrapVersionSchema = exports.ProfileCacheEntrySchema = exports.ProfileSnapshotServerSchema = exports.CatalogsSchema = exports.CatalogEntrySchema = exports.shipSchema = exports.starSystemSchema = exports.planetSchema = exports.universeSettingsSchema = exports.gameActionSchema = exports.fleetMoveSchema = exports.fleetCreationSchema = exports.empireUpdateSchema = exports.empireCreationSchema = exports.coordinateSchema = exports.registerSchema = exports.loginSchema = void 0;
exports.validateLogin = validateLogin;
exports.validateRegister = validateRegister;
exports.validateCoordinates = validateCoordinates;
exports.validateEmpireCreation = validateEmpireCreation;
exports.validateFleetCreation = validateFleetCreation;
exports.validateFleetMove = validateFleetMove;
exports.validateGameAction = validateGameAction;
exports.parseCatalogEntry = parseCatalogEntry;
exports.normalizeCatalogs = normalizeCatalogs;
exports.fromServerProfileSnapshot = fromServerProfileSnapshot;
exports.parseAndNormalizeBootstrap = parseAndNormalizeBootstrap;
const zod_1 = require("zod");
// User validation schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters')
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be less than 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: zod_1.z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters')
});
// Coordinate validation
exports.coordinateSchema = zod_1.z.object({
    x: zod_1.z.number().int().min(0),
    y: zod_1.z.number().int().min(0)
});
// Empire validation schemas
exports.empireCreationSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Empire name must be at least 3 characters')
        .max(30, 'Empire name must be less than 30 characters')
        .regex(/^[a-zA-Z0-9\s]+$/, 'Empire name can only contain letters, numbers, and spaces')
});
exports.empireUpdateSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Empire name must be at least 3 characters')
        .max(30, 'Empire name must be less than 30 characters')
        .regex(/^[a-zA-Z0-9\s]+$/, 'Empire name can only contain letters, numbers, and spaces')
        .optional()
});
// Fleet validation schemas
exports.fleetCreationSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(3, 'Fleet name must be at least 3 characters')
        .max(20, 'Fleet name must be less than 20 characters'),
    systemId: zod_1.z.string().min(1, 'System ID is required')
});
exports.fleetMoveSchema = zod_1.z.object({
    fleetId: zod_1.z.string().min(1, 'Fleet ID is required'),
    destination: exports.coordinateSchema
});
// Game action validation
exports.gameActionSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Action type is required'),
    payload: zod_1.z.any(),
    empireId: zod_1.z.string().min(1, 'Empire ID is required')
});
// Universe settings validation
exports.universeSettingsSchema = zod_1.z.object({
    maxPlayers: zod_1.z.number().int().min(2).max(1000),
    gameSpeed: zod_1.z.number().min(0.1).max(10),
    startingResources: zod_1.z.object({
        credits: zod_1.z.number().int().min(0),
        minerals: zod_1.z.number().int().min(0),
        energy: zod_1.z.number().int().min(0)
    })
});
// Planet validation
exports.planetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    type: zod_1.z.enum(['terrestrial', 'gas_giant', 'ice', 'desert', 'volcanic']),
    size: zod_1.z.enum(['small', 'medium', 'large']),
    population: zod_1.z.number().int().min(0),
    infrastructure: zod_1.z.object({
        mines: zod_1.z.number().int().min(0),
        factories: zod_1.z.number().int().min(0),
        research_labs: zod_1.z.number().int().min(0),
        defense_stations: zod_1.z.number().int().min(0)
    }),
    resources: zod_1.z.object({
        minerals: zod_1.z.number().int().min(0),
        energy: zod_1.z.number().int().min(0)
    })
});
// Star system validation
exports.starSystemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    coordinates: exports.coordinateSchema,
    planets: zod_1.z.array(exports.planetSchema),
    owner: zod_1.z.string().optional(),
    resources: zod_1.z.object({
        minerals: zod_1.z.number().int().min(0),
        energy: zod_1.z.number().int().min(0)
    }),
    defenseLevel: zod_1.z.number().int().min(0)
});
// Ship validation
exports.shipSchema = zod_1.z.object({
    type: zod_1.z.enum(['scout', 'fighter', 'cruiser', 'battleship', 'transport']),
    health: zod_1.z.number().int().min(0),
    maxHealth: zod_1.z.number().int().min(1),
    attack: zod_1.z.number().int().min(0),
    defense: zod_1.z.number().int().min(0),
    speed: zod_1.z.number().min(0),
    cargo: zod_1.z.object({
        minerals: zod_1.z.number().int().min(0),
        energy: zod_1.z.number().int().min(0),
        capacity: zod_1.z.number().int().min(0)
    }).optional()
});
// Validation helper functions
function validateLogin(data) {
    return exports.loginSchema.safeParse(data);
}
function validateRegister(data) {
    return exports.registerSchema.safeParse(data);
}
function validateCoordinates(data) {
    return exports.coordinateSchema.safeParse(data);
}
function validateEmpireCreation(data) {
    return exports.empireCreationSchema.safeParse(data);
}
function validateFleetCreation(data) {
    return exports.fleetCreationSchema.safeParse(data);
}
function validateFleetMove(data) {
    return exports.fleetMoveSchema.safeParse(data);
}
function validateGameAction(data) {
    return exports.gameActionSchema.safeParse(data);
}
/* ============================================
 * Desktop cache validation & normalization (Phase 4)
 * ============================================
 * These helpers validate and normalize bootstrap payloads and cached content
 * so the Electron app can safely persist and read catalogs/profile data.
 */
// Catalog entry: preferred form used by desktop cache
exports.CatalogEntrySchema = zod_1.z.object({
    data: zod_1.z.unknown(),
    version: zod_1.z.string().optional(),
    contentHash: zod_1.z.string().optional()
});
// Catalogs container: keys are optional to allow partial caching
exports.CatalogsSchema = zod_1.z.object({
    technologies: zod_1.z.unknown().optional(),
    buildings: zod_1.z.unknown().optional(),
    defenses: zod_1.z.unknown().optional(),
    units: zod_1.z.unknown().optional()
});
// Server-side profile snapshot (from /sync/bootstrap)
exports.ProfileSnapshotServerSchema = zod_1.z.object({
    user: zod_1.z.object({
        _id: zod_1.z.any(),
        username: zod_1.z.string(),
        email: zod_1.z.string().email()
    }).passthrough(),
    empire: zod_1.z.any(),
    profile: zod_1.z.object({
        economyPerHour: zod_1.z.number(),
        fleetScore: zod_1.z.number(),
        technologyScore: zod_1.z.number(),
        level: zod_1.z.number()
    }).passthrough(),
    // Allow additional fields like lastResourceUpdate, creditsPerHour, serverInfo
}).passthrough();
// Desktop cache profile entry (normalized form)
exports.ProfileCacheEntrySchema = zod_1.z.object({
    userId: zod_1.z.string(),
    deviceId: zod_1.z.string(),
    data: zod_1.z.unknown(),
    schemaVersion: zod_1.z.number().int().min(1).optional()
});
// Version payload is flexible server-side; desktop normalizes to a string
exports.BootstrapVersionSchema = zod_1.z.object({
    catalogs: zod_1.z.string().optional(),
    profile: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().optional()
}).optional();
/**
 * Normalize any catalog value into a CatalogEntry shape.
 * - If already in { data, version?, contentHash? } form, validate and return.
 * - Otherwise, wrap raw value as { data: raw, version?: defaultVersion }.
 */
function parseCatalogEntry(value, defaultVersion) {
    if (value && typeof value === 'object' && ('data' in value)) {
        const parsed = exports.CatalogEntrySchema.safeParse(value);
        if (parsed.success)
            return parsed.data;
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
function normalizeCatalogs(input, defaultVersion) {
    const parsed = exports.CatalogsSchema.safeParse(input);
    if (!parsed.success) {
        throw parsed.error;
    }
    const src = parsed.data;
    const out = {};
    for (const key of ['technologies', 'buildings', 'defenses', 'units']) {
        if (key in src && src[key] !== undefined) {
            out[key] = parseCatalogEntry(src[key], defaultVersion);
        }
    }
    return out;
}
/**
 * Convert a server ProfileSnapshot into a desktop ProfileCacheEntry.
 */
function fromServerProfileSnapshot(snap, deviceId) {
    const parsed = exports.ProfileSnapshotServerSchema.safeParse(snap);
    if (!parsed.success) {
        throw parsed.error;
    }
    const userId = String(parsed.data.user._id);
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
function parseAndNormalizeBootstrap(input, opts) {
    if (!input || typeof input !== 'object') {
        throw new Error('Bootstrap payload must be an object');
    }
    const obj = input;
    // Determine version string
    // Prefer server version.catalogs, else version string, else fallback
    const versionValue = (obj?.version && typeof obj.version === 'object' && typeof obj.version.catalogs === 'string'
        ? obj.version.catalogs
        : (typeof obj.version === 'string' ? obj.version : undefined))
        || opts?.fallbackVersion
        || '1.0.0';
    // Catalogs (tolerate both desktop and server shapes)
    let catalogs = undefined;
    if (obj?.catalogs) {
        catalogs = normalizeCatalogs(obj.catalogs, versionValue);
    }
    // Profile (tolerate desktop 'profile' or server 'profileSnapshot')
    let profile = undefined;
    if (obj?.profile) {
        const p = exports.ProfileCacheEntrySchema.safeParse(obj.profile);
        if (!p.success) {
            throw p.error;
        }
        profile = p.data;
    }
    else if (obj?.profileSnapshot) {
        const deviceId = opts?.deviceId || 'unknown-device';
        profile = fromServerProfileSnapshot(obj.profileSnapshot, deviceId);
    }
    return {
        version: String(versionValue),
        catalogs,
        profile
    };
}
