/**
 * API Endpoint Constants
 * 
 * Centralized definition of all API endpoints to prevent hardcoding.
 * Following Constants Workflow methodology.
 */

export const API_ENDPOINTS = {
  // Game API Routes
  GAME: {
    // Base path
    BASE: '/api/game',
    
    // Territory management
    TERRITORIES: '/api/game/territories',
    TERRITORIES_BY_COORD: '/api/game/territories/:coord',
    
    // Base management
    BASES: '/api/game/bases',
    BASES_SUMMARY: '/api/game/bases/summary',
    BASES_STATS: '/api/game/bases/:coord/stats',
    BASES_CAPACITIES: '/api/game/bases/:coord/capacities',
    BASES_COMBINED_STATS: '/api/game/bases/:coord/combined-stats',
    BASES_STRUCTURES: '/api/game/bases/:coord/structures',
    BASES_DEFENSES: '/api/game/bases/:coord/defenses',
    
    // Direct capacity endpoint (missing - causes 404)
    CAPACITIES: '/api/game/capacities/:coord',
    
    // Building management (missing - causes 404)
    BUILDINGS: '/api/game/buildings',
    BUILDINGS_BY_LOCATION: '/api/game/buildings/location/:coord',
    
    // Structure management
    STRUCTURES: '/api/game/structures',
    STRUCTURES_CATALOG: '/api/game/structures/catalog',
    STRUCTURES_QUEUE: '/api/game/structures/queue',
    STRUCTURES_STATUS: '/api/game/structures/status/:coord',
    STRUCTURES_START: '/api/game/structures/start',
    STRUCTURES_CANCEL: '/api/game/structures/cancel/:coord',
    
    // Technology research
    TECH: '/api/game/tech',
    TECH_CATALOG: '/api/game/tech/catalog',
    TECH_STATUS: '/api/game/tech/status',
    TECH_QUEUE: '/api/game/tech/queue',
    TECH_START: '/api/game/tech/start',
    TECH_CANCEL: '/api/game/tech/queue/:id',
    
    // Defense systems
    DEFENSES: '/api/game/defenses',
    DEFENSES_CATALOG: '/api/game/defenses/catalog',
    DEFENSES_STATUS: '/api/game/defenses/status',
    DEFENSES_QUEUE: '/api/game/defenses/queue',
    
    // Fleet management
    FLEETS: '/api/game/fleets',
    FLEETS_OVERVIEW: '/api/game/fleets-overview',
    FLEETS_BY_ID: '/api/game/fleets/:id',
    FLEETS_MOVE: '/api/game/fleets/:id/move',
    
    // Empire management
    EMPIRE: '/api/game/empire',
    EMPIRE_CREDITS_HISTORY: '/api/game/empire/credits/history',
    
    // Dashboard
    DASHBOARD: '/api/game/dashboard',
    
    // Research
    RESEARCH: '/api/game/research',
    
    // Messages
    MESSAGES_SUMMARY: '/api/game/messages/summary',
    
    // Units management
    UNITS: '/api/game/units',
    UNITS_CATALOG: '/api/game/units/catalog',
    UNITS_STATUS: '/api/game/units/status',
    UNITS_START: '/api/game/units/start',
    UNITS_QUEUE: '/api/game/units/queue',
    UNITS_BASE: '/api/game/units/base-units',
    
    // Test endpoints
    TEST: {
      SEED_RESEARCH: '/api/game/test/seed-research',
      SEED_DEFENSES: '/api/game/test/seed-defenses',
      SEED_STRUCTURES: '/api/game/test/seed-structures',
      BUILDINGS_QUEUED: '/api/game/test/buildings/queued/:catalogKey'
    }
  },
  
  // Universe/Location endpoints
  UNIVERSE: {
    BASE: '/api/universe',
    COORD: '/api/universe/coord/:coord'
  },
  
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  
  // System endpoints
  SYSTEM: {
    STATUS: '/api/system/status',
    HEALTH: '/api/system/health'
  },
  
  // Legacy V1 endpoints (to be migrated and removed)
  V1: {
    // Base paths
    BASE: '/api/v1',
    
    // Territory management
    TERRITORIES: '/api/v1/territories',
    BASE_STATS: '/api/v1/territories/base-stats/:coord',
    CAPACITIES: '/api/v1/territories/capacities/:coord',
    BASES_STATS: '/api/v1/territories/bases/:coord/stats',
    BASES_SUMMARY: '/api/v1/territories/bases/summary',
    
    // Building management
    BUILDINGS: '/api/v1/buildings',
    BUILDINGS_CATALOG: '/api/v1/buildings/catalog',
    BUILDINGS_CONSTRUCT: '/api/v1/buildings/construct',
    BUILDINGS_CANCEL: '/api/v1/buildings/cancel',
    BUILDINGS_STATUS: '/api/v1/buildings/status',
    BUILDINGS_QUEUE: '/api/v1/buildings/queue',
    BUILDINGS_UPGRADE: '/api/v1/buildings/upgrade',
    
    // Fleet management
    FLEETS: '/api/v1/fleets',
    FLEETS_CREATE: '/api/v1/fleets/create',
    FLEETS_MOVE: '/api/v1/fleets/:id/move',
    FLEETS_STATUS: '/api/v1/fleets/status',
    
    // Technology management
    TECHNOLOGY: '/api/v1/technology',
    TECHNOLOGY_CATALOG: '/api/v1/technology/catalog',
    TECHNOLOGY_RESEARCH: '/api/v1/technology/research',
    TECHNOLOGY_QUEUE: '/api/v1/technology/queue',
    
    // Unit management
    UNITS: '/api/v1/units',
    UNITS_CATALOG: '/api/v1/units/catalog',
    UNITS_STATUS: '/api/v1/units/status',
    UNITS_BASE: '/api/v1/units/base-units',
    
    // Empire management
    EMPIRE: '/api/v1/empire',
    EMPIRE_DASHBOARD: '/api/v1/empire/dashboard'
  },
  
  // Admin endpoints
  ADMIN: {
    BASE: '/api/admin',
    STATUS: '/api/admin/status',
    USERS: '/api/admin/users',
    EMPIRES: '/api/admin/empires'
  },
  
  // Sync endpoints
  SYNC: {
    BASE: '/api/sync',
    STATUS: '/api/sync/status'
  },
  
  // Messages endpoints  
  MESSAGES: {
    BASE: '/api/messages',
    LIST: '/api/messages',
    MARK_READ: '/api/messages/mark-read',
    DELETE: '/api/messages/delete'
  }
} as const;

/**
 * Helper function to build parameterized URLs
 */
export const buildEndpoint = (template: string, params: Record<string, string>): string => {
  let url = template;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });
  return url;
};

/**
 * Type helper for endpoint parameters
 */
export type EndpointParams<T extends string> = T extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & EndpointParams<`/${Rest}`>
  : T extends `${infer _Start}:${infer Param}`
  ? { [K in Param]: string }
  : Record<string, never>;
