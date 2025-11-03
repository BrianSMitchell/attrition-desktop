/**
 * API Endpoint Constants
 * 
 * Centralized API endpoint paths for consistent API calls
 * 
 * Note: This file is duplicated in src/stores/constants/api-endpoints.ts
 * Consider consolidating to a single location.
 */

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  
  // Game endpoints
  GAME: {
    EMPIRE: '/game/empire',
    DASHBOARD: '/game/dashboard',
    CREDITS_HISTORY: '/game/empire/credits/history',
  },
  
  // Base endpoints
  BASES: {
    LIST: '/game/bases',
    DETAIL: '/game/base',
    STATS: '/game/base/stats',
    BUILD: '/game/base/build',
    CANCEL: '/game/base/cancel',
  },
  
  // Fleet endpoints
  FLEETS: {
    LIST: '/game/fleets',
    DETAIL: '/game/fleet',
    MOVE: '/game/fleet/move',
    CANCEL: '/game/fleet/cancel',
  },
  
  // Research endpoints
  RESEARCH: {
    CATALOG: '/game/tech/catalog',
    STATUS: '/game/tech/status',
    QUEUE: '/game/tech/queue',
    START: '/game/tech/start',
    CANCEL: '/game/tech/cancel',
  },
  
  // Defense endpoints
  DEFENSES: {
    CATALOG: '/game/defenses/catalog',
    STATUS: '/game/defenses/status',
    QUEUE: '/game/defenses/queue',
    BUILD: '/game/defenses/build',
  },
  
  // Structure endpoints
  STRUCTURES: {
    CATALOG: '/game/structures/catalog',
    BUILD: '/game/structures/build',
  },
  
  // Universe endpoints
  UNIVERSE: {
    SUMMARY: '/game/universe/summary',
    GALAXY: '/game/universe/galaxy',
    PLANET: '/game/universe/planet',
  },
  
  // Message endpoints
  MESSAGES: {
    LIST: '/game/messages',
    DETAIL: '/game/message',
    MARK_READ: '/game/message/read',
    DELETE: '/game/message/delete',
  },
  
  // System endpoints
  SYSTEM: {
    STATUS: '/system/status',
    HEALTH: '/system/health',
    VERSION: '/system/version',
  },
} as const;
