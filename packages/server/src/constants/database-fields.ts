/**
 * Database Field Constants
 * 
 * Centralized definition of all database field names to prevent hardcoding.
 * Following Constants Workflow methodology.
 */

export const DB_FIELDS = {
  // Buildings table
  BUILDINGS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    LOCATION_COORD: 'location_coord',
    CATALOG_KEY: 'catalog_key',
    LEVEL: 'level',
    IS_ACTIVE: 'is_active',
    PENDING_UPGRADE: 'pending_upgrade',
    CONSTRUCTION_STARTED: 'construction_started',
    CONSTRUCTION_COMPLETED: 'construction_completed',
    CREDITS_COST: 'credits_cost',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Empires table
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
  },
  
  // Users table
  USERS: {
    ID: 'id',
    EMAIL: 'email',
    USERNAME: 'username',
    PASSWORD_HASH: 'password_hash',
    EMPIRE_ID: 'empire_id',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Locations table
  LOCATIONS: {
    COORD: 'coord',
    OWNER_ID: 'owner_id',
    RESULT: 'result',
    SYSTEM_NAME: 'system_name',
    PLANET_TYPE: 'planet_type',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Colonies table
  COLONIES: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    LOCATION_COORD: 'location_coord',
    NAME: 'name',
    FOUNDED_AT: 'founded_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Tech queue table
  TECH_QUEUE: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    LOCATION_COORD: 'location_coord',
    TECH_KEY: 'tech_key',
    STATUS: 'status',
    STARTED_AT: 'started_at',
    COMPLETES_AT: 'completes_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Credit transactions table
  CREDIT_TRANSACTIONS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    AMOUNT: 'amount',
    TYPE: 'type',
    NOTE: 'note',
    BALANCE_AFTER: 'balance_after',
    CREATED_AT: 'created_at'
  },
  
  // Defenses table (if exists)
  DEFENSES: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    LOCATION_COORD: 'location_coord',
    CATALOG_KEY: 'catalog_key',
    LEVEL: 'level',
    IS_ACTIVE: 'is_active',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Fleets table (if exists)
  FLEETS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    NAME: 'name',
    LOCATION_COORD: 'location_coord',
    STATUS: 'status',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Tech levels table
  TECH_LEVELS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    TECH_KEY: 'tech_key',
    LEVEL: 'level',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Unit queue table
  UNIT_QUEUE: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    UNIT_KEY: 'unit_key',
    LOCATION_COORD: 'location_coord',
    STATUS: 'status',
    STARTED_AT: 'started_at',
    COMPLETES_AT: 'completes_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Defense queue table
  DEFENSE_QUEUE: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    DEFENSE_KEY: 'defense_key',
    LOCATION_COORD: 'location_coord',
    STATUS: 'status',
    STARTED_AT: 'started_at',
    COMPLETES_AT: 'completes_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Messages table
  MESSAGES: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    TYPE: 'type',
    SUBJECT: 'subject',
    CONTENT: 'content',
    READ: 'read',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Research projects table
  RESEARCH_PROJECTS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    TECH_KEY: 'tech_key',
    LEVEL: 'level',
    IS_COMPLETED: 'is_completed',
    STARTED_AT: 'started_at',
    COMPLETED_AT: 'completed_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  },
  
  // Fleet movements table
  FLEET_MOVEMENTS: {
    ID: 'id',
    FLEET_ID: 'fleet_id',
    EMPIRE_ID: 'empire_id',
    FROM_COORD: 'from_coord',
    TO_COORD: 'to_coord',
    STATUS: 'status',
    STARTED_AT: 'started_at',
    ARRIVES_AT: 'arrives_at',
    CREATED_AT: 'created_at',
    UPDATED_AT: 'updated_at'
  }
} as const;

/**
 * Database table names
 */
export const DB_TABLES = {
  BUILDINGS: 'buildings',
  EMPIRES: 'empires',
  USERS: 'users',
  LOCATIONS: 'locations',
  COLONIES: 'colonies',
  TECH_QUEUE: 'tech_queue',
  CREDIT_TRANSACTIONS: 'credit_transactions',
  DEFENSES: 'defenses',
  FLEETS: 'fleets',
  TECH_LEVELS: 'tech_levels',
  UNIT_QUEUE: 'unit_queue',
  UNIT_QUEUES: 'unit_queues', // plural version
  TECH_QUEUES: 'tech_queues', // plural version
  DEFENSE_QUEUE: 'defense_queue',
  DEFENSE_QUEUES: 'defense_queues', // plural version
  MESSAGES: 'messages',
  RESEARCH_PROJECTS: 'research_projects',
  FLEET_MOVEMENTS: 'fleet_movements',
  UNITS: 'units'
} as const;

/**
 * Common field select patterns
 */
export const DB_SELECTS = {
  BUILDINGS: {
    BASIC: `${DB_FIELDS.BUILDINGS.ID}, ${DB_FIELDS.BUILDINGS.CATALOG_KEY}, ${DB_FIELDS.BUILDINGS.LEVEL}, ${DB_FIELDS.BUILDINGS.IS_ACTIVE}`,
    FULL: `${DB_FIELDS.BUILDINGS.ID}, ${DB_FIELDS.BUILDINGS.EMPIRE_ID}, ${DB_FIELDS.BUILDINGS.LOCATION_COORD}, ${DB_FIELDS.BUILDINGS.CATALOG_KEY}, ${DB_FIELDS.BUILDINGS.LEVEL}, ${DB_FIELDS.BUILDINGS.IS_ACTIVE}, ${DB_FIELDS.BUILDINGS.PENDING_UPGRADE}, ${DB_FIELDS.BUILDINGS.CONSTRUCTION_STARTED}, ${DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED}, ${DB_FIELDS.BUILDINGS.CREDITS_COST}`,
    CONSTRUCTION: `${DB_FIELDS.BUILDINGS.ID}, ${DB_FIELDS.BUILDINGS.CATALOG_KEY}, ${DB_FIELDS.BUILDINGS.LEVEL}, ${DB_FIELDS.BUILDINGS.CONSTRUCTION_STARTED}, ${DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED}, ${DB_FIELDS.BUILDINGS.CREDITS_COST}, ${DB_FIELDS.BUILDINGS.PENDING_UPGRADE}`
  },
  
  EMPIRES: {
    BASIC: `${DB_FIELDS.EMPIRES.ID}, ${DB_FIELDS.EMPIRES.NAME}, ${DB_FIELDS.EMPIRES.TERRITORIES}`,
    FULL: `${DB_FIELDS.EMPIRES.ID}, ${DB_FIELDS.EMPIRES.USER_ID}, ${DB_FIELDS.EMPIRES.NAME}, ${DB_FIELDS.EMPIRES.HOME_SYSTEM}, ${DB_FIELDS.EMPIRES.TERRITORIES}, ${DB_FIELDS.EMPIRES.CREDITS}, ${DB_FIELDS.EMPIRES.ENERGY}`,
    RESOURCES: `${DB_FIELDS.EMPIRES.ID}, ${DB_FIELDS.EMPIRES.CREDITS}, ${DB_FIELDS.EMPIRES.ENERGY}`
  },
  
  COLONIES: {
    BASIC: `${DB_FIELDS.COLONIES.LOCATION_COORD}, ${DB_FIELDS.COLONIES.NAME}`,
    FULL: `${DB_FIELDS.COLONIES.ID}, ${DB_FIELDS.COLONIES.EMPIRE_ID}, ${DB_FIELDS.COLONIES.LOCATION_COORD}, ${DB_FIELDS.COLONIES.NAME}, ${DB_FIELDS.COLONIES.FOUNDED_AT}`
  },
  
  LOCATIONS: {
    BASIC: `${DB_FIELDS.LOCATIONS.COORD}, ${DB_FIELDS.LOCATIONS.OWNER_ID}`,
    FULL: `${DB_FIELDS.LOCATIONS.COORD}, ${DB_FIELDS.LOCATIONS.OWNER_ID}, ${DB_FIELDS.LOCATIONS.RESULT}, ${DB_FIELDS.LOCATIONS.SYSTEM_NAME}, ${DB_FIELDS.LOCATIONS.PLANET_TYPE}`
  }
} as const;