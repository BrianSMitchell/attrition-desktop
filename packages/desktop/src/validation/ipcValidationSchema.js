/**
 * IPC Validation Schema
 * Defines validation schemas for all IPC handlers
 * 
 * Uses Zod for type-safe validation and sanitization
 */

// Importing Zod from shared package if available, or as direct dependency
let z;
try {
  const shared = await import('@game/shared');
  z = shared.z; // Use shared Zod instance if available
} catch (error) {
  try {
    const zodModule = await import('zod');
    z = zodModule.default || zodModule.z;
  } catch (innerError) {
    console.error('[IPC Validation] Failed to import Zod, validation will not work properly:', innerError);
    // Fallback mock implementation if Zod isn't available
    z = {
      object: () => ({ parse: (data) => data }),
      string: () => ({ parse: (data) => data }),
      number: () => ({ parse: (data) => data }),
      boolean: () => ({ parse: (data) => data }),
      array: () => ({ parse: (data) => data }),
      enum: () => ({ parse: (data) => data }),
      optional: () => ({ parse: (data) => data }),
    };
  }
}

/**
 * Common schema patterns
 */
const CommonSchemas = {
  // Non-empty trimmed string
  nonEmptyString: z.string().trim().min(1),
  
  // Email validation
  email: z.string().email().toLowerCase().trim(),
  
  // Sanitized string (basic XSS prevention)
  sanitizedString: z.string().transform(str => 
    str.replace(/[<>]/g, match => match === '<' ? '&lt;' : '&gt;')
  ),
  
  // Positive integer
  positiveInt: z.number().int().positive(),
  
  // UUID pattern
  uuid: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  
  // ISO Date string
  isoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/),
  
  // Coordinates (for game data)
  coordString: z.string().regex(/^[A-Z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}$/),
  
  // Safe object keys (prevents prototype pollution)
  safeObjectKeys: z.record(z.string()).refine(
    obj => Object.keys(obj).every(key => !['__proto__', 'constructor', 'prototype'].includes(key)),
    { message: "Object contains unsafe property names" }
  ),
  
  // JWT token pattern
  jwtToken: z.string().regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/),
  
  // File path validation
  safePath: z.string().refine(
    path => !path.includes('..') && !path.includes('~'),
    { message: "Path contains unsafe sequences" }
  )
};

/**
 * Authentication Schemas
 */
const AuthSchemas = {
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(8)
  }),
  
  register: z.object({
    email: CommonSchemas.email,
    username: z.string().min(3).max(50),
    password: z.string().min(8)
  }),
  
  refresh: z.object({}).strict(), // No params needed, refreshToken stored in keytar
  
  saveRefresh: z.object({
    refreshToken: CommonSchemas.jwtToken
  }),
  
  deleteRefresh: z.object({}).strict()
};

/**
 * Database Operation Schemas
 */
const DbSchemas = {
  bootstrapFetchAndCache: z.object({
    accessToken: CommonSchemas.jwtToken
  }),
  
  kvSet: z.object({
    key: CommonSchemas.nonEmptyString,
    value: z.any(),
    options: z.object({
      ttl: z.number().optional()
    }).optional()
  }),
  
  kvGet: z.object({
    key: CommonSchemas.nonEmptyString,
    defaultValue: z.any().optional()
  }),
  
  kvDelete: z.object({
    key: CommonSchemas.nonEmptyString
  }),
  
  catalogsSet: z.object({
    key: CommonSchemas.nonEmptyString,
    data: CommonSchemas.safeObjectKeys
  }),
  
  catalogsGet: z.object({
    key: CommonSchemas.nonEmptyString,
    defaultValue: z.any().optional()
  }),
  
  profileSet: z.object({
    data: CommonSchemas.safeObjectKeys
  }),
  
  profileGet: z.object({
    defaultValue: z.any().optional()
  }),
  
  health: z.object({}).strict()
};

/**
 * Event Queue Schemas
 */
const EventQueueSchemas = {
  enqueue: z.object({
    kind: z.enum(['structures', 'research', 'fleet', 'trade', 'diplomacy', 'system']),
    payload: CommonSchemas.safeObjectKeys,
    options: z.object({
      identityKey: CommonSchemas.nonEmptyString,
      priority: z.number().int().min(0).max(100).optional()
    })
  }),
  
  getStatus: z.object({
    includePayloads: z.boolean().optional()
  }),
  
  getEvents: z.object({
    status: z.enum(['pending', 'sent', 'failed']).optional(),
    limit: z.number().int().min(1).max(1000).optional()
  }),
  
  flushEvents: z.object({
    limit: z.number().int().min(1).max(100).optional()
  }),
  
  cancelEvent: z.object({
    id: CommonSchemas.nonEmptyString
  })
};

/**
 * Error Logging Schemas
 */
const ErrorSchemas = {
  log: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    message: CommonSchemas.sanitizedString,
    details: z.any().optional(),
    tags: z.array(CommonSchemas.sanitizedString).optional()
  }),
  
  getRecent: z.object({
    limit: z.number().int().min(1).max(1000).optional(),
    level: z.enum(['error', 'warn', 'info', 'debug']).optional(),
    since: CommonSchemas.isoDate.optional()
  }),
  
  export: z.object({
    path: CommonSchemas.safePath.optional(),
    limit: z.number().int().min(1).max(10000).optional()
  })
};

/**
 * Performance Monitoring Schemas
 */
const PerfSchemas = {
  getMetrics: z.object({
    hours: z.number().int().min(1).max(168).optional()
  }),
  
  getStats: z.object({
    hours: z.number().int().min(1).max(168).optional()
  }),
  
  export: z.object({
    path: CommonSchemas.safePath.optional(),
    hours: z.number().int().min(1).max(168).optional()
  }),
  
  setThresholds: z.object({
    cpu: z.number().min(1).max(100).optional(),
    memory: z.number().min(1).optional(),
    fps: z.number().min(1).max(240).optional(),
    diskSpace: z.number().min(1).optional(),
    apiLatency: z.number().min(1).optional()
  })
};

/**
 * App Utility Schemas
 */
const AppSchemas = {
  getVersion: z.object({}).strict(),
  
  openExternal: z.object({
    url: z.string().url()
  })
};

/**
 * Network Status Schemas
 */
const NetworkSchemas = {
  getStatus: z.object({}).strict(),
  
  isFullyConnected: z.object({}).strict(),
  
  checkConnectivity: z.object({
    force: z.boolean().optional()
  })
};

/**
 * Combined validation schemas for all IPC channels
 */
const IpcValidationSchemas = {
  // Auth endpoints
  'auth:login': AuthSchemas.login,
  'auth:register': AuthSchemas.register,
  'auth:refresh': AuthSchemas.refresh,
  'tokens:saveRefresh': AuthSchemas.saveRefresh,
  'tokens:deleteRefresh': AuthSchemas.deleteRefresh,
  'tokens:hasRefresh': z.object({}).strict(),
  
  // Database operations
  'db:bootstrap:fetchAndCache': DbSchemas.bootstrapFetchAndCache,
  'db:kv:set': DbSchemas.kvSet,
  'db:kv:get': DbSchemas.kvGet,
  'db:kv:delete': DbSchemas.kvDelete,
  'db:catalogs:set': DbSchemas.catalogsSet,
  'db:catalogs:get': DbSchemas.catalogsGet,
  'db:profile:set': DbSchemas.profileSet,
  'db:profile:get': DbSchemas.profileGet,
  'db:health': DbSchemas.health,
  
  // Event queue operations
  'eventQueue:enqueue': EventQueueSchemas.enqueue,
  'eventQueue:getStatus': EventQueueSchemas.getStatus,
  'eventQueue:getEvents': EventQueueSchemas.getEvents,
  'eventQueue:flushEvents': EventQueueSchemas.flushEvents,
  'eventQueue:cancelEvent': EventQueueSchemas.cancelEvent,
  
  // Error logging
  'error:log': ErrorSchemas.log,
  'error:getRecent': ErrorSchemas.getRecent,
  'error:export': ErrorSchemas.export,
  
  // Performance monitoring
  'perf:getMetrics': PerfSchemas.getMetrics,
  'perf:getStats': PerfSchemas.getStats,
  'perf:export': PerfSchemas.export,
  'perf:setThresholds': PerfSchemas.setThresholds,
  
  // App utilities
  'app:getVersion': AppSchemas.getVersion,
  'app:openExternal': AppSchemas.openExternal,
  
  // Network status
  'network:getStatus': NetworkSchemas.getStatus,
  'network:isFullyConnected': NetworkSchemas.isFullyConnected,
  'network:checkConnectivity': NetworkSchemas.checkConnectivity
};

export { 
  IpcValidationSchemas,
  CommonSchemas,
  z // Re-export for use in other modules
};
