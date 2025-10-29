/**
 * Component Default States Constants
 * 
 * Centralizes all default state values used in React component useState initializations
 * across the Attrition client codebase. This ensures consistency and makes it easy
 * to maintain and update default component states from a single location.
 * 
 * @fileoverview Default state values for React component useState hooks
 * @version 1.0.0
 */

/**
 * Authentication and User-related Default States
 */
export const DEFAULT_STATES = {
  /** Authentication form states */
  AUTH: {
    /** Empty email field */
    EMAIL: '',
    /** Empty password field */
    PASSWORD: '',
    /** Empty username field */
    USERNAME: '',
    /** Empty confirm password field */
    CONFIRM_PASSWORD: '',
    /** Remember me checkbox unchecked */
    REMEMBER_ME: false,
    /** Default retry attempt count */
    RETRY_ATTEMPT: 0,
    /** Default credentials object */
    CREDENTIALS: {
      email: '',
      password: ''
    } as const,
  },

  /** Loading and processing states */
  LOADING: {
    /** Default loading state */
    LOADING: false,
    /** Default saving state */
    SAVING: false,
    /** Default processing state */
    PROCESSING: false,
    /** Fleet-specific loading */
    FLEETS_LOADING: true,
    /** Direct loading state */
    DIRECT_LOADING: false,
    /** Validation loading */
    VALIDATING_LOCATION: false,
    /** Calculation loading */
    IS_CALCULATING: false,
    /** Dispatching state */
    IS_DISPATCHING: false,
    /** Recalling state */
    IS_RECALLING: false,
  },

  /** Counter and numeric states */
  COUNTERS: {
    /** Default retry counter */
    RETRY_ATTEMPT: 0,
    /** Default tick counter (for timers) */
    TICK: 0,
    /** Empty quantities record */
    QUANTITIES: {} as Record<string, number>,
  },

  /** Text input states */
  TEXT_INPUTS: {
    /** Empty string input */
    EMPTY_STRING: '',
    /** Empty coordinate input */
    COORDINATE_INPUT: '',
    /** Empty destination coordinate */
    DESTINATION_COORD: '',
    /** Empty recall reason */
    RECALL_REASON: '',
  },

  /** Boolean flags and toggles */
  FLAGS: {
    /** Default false flag */
    FALSE: false,
    /** Default true flag */
    TRUE: true,
    /** Map selection toggle */
    USE_MAP_SELECTION: false,
    /** Recall form visibility */
    SHOW_RECALL_FORM: false,
    /** Compact view toggle (with localStorage fallback) */
    COMPACT: false,
  },

  /** Array collections - all initialized as empty arrays */
  ARRAYS: {
    /** Empty generic array */
    EMPTY: [] as any[],
    /** Empty fleet list */
    FLEETS: [] as any[],
    /** Empty fleet summaries */
    FLEET_SUMMARIES: [] as any[],
    /** Empty fleet rows */
    FLEET_ROWS: [] as any[],
    /** Empty buildings */
    BUILDINGS: [] as any[],
    /** Empty defenses */
    DEFENSES: [] as any[],
    /** Empty base summaries */
    BASE_SUMMARIES: [] as any[],
    /** Empty territories */
    TERRITORIES: [] as any[],
    /** Empty thresholds */
    THRESHOLDS: [] as any[],
    /** Empty breaches */
    BREACHES: [] as any[],
  },

  /** Object states - complex default objects */
  OBJECTS: {
    /** Null object */
    NULL: null,
    /** Empty object */
    EMPTY_OBJECT: {} as Record<string, any>,
    /** Empty record by string key */
    EMPTY_RECORD: {} as Record<string, any>,
    /** Empty economic map */
    ECON_MAP: {} as Record<string, any>,
    /** Empty capacities object */
    CAPACITIES: null as {
      construction?: number;
      production?: number;
      research?: number;
      citizen?: number;
    } | null,
    /** Empty capacity results */
    CAPACITY_RESULTS: {} as any,
  },

  /** Game-specific states */
  GAME: {
    /** Default HUD state for universe map */
    HUD: {
      visible: true,
      selectedSystem: null,
    } as any,
    /** Empty coordinate */
    COORDINATE: '',
    /** Default fleet destination */
    FLEET_DESTINATION: '',
    /** Default base coordinate */
    BASE_COORD: '',
  },

  /** Error and message states */
  ERRORS: {
    /** No error */
    NO_ERROR: null as string | null,
    /** Empty error */
    EMPTY_ERROR: '',
    /** Default error state */
    ERROR: null as Error | null,
  },

  /** Admin and performance states */
  ADMIN: {
    /** Empty performance thresholds */
    PERFORMANCE_THRESHOLDS: [] as Array<{
      op?: string;
      p95Ms?: number;
      failRatePct?: number;
    }>,
    /** Empty breach records */
    PERFORMANCE_BREACHES: [] as Array<{
      op?: string;
      metric: 'p95Ms' | 'failRatePct';
      value: number;
      threshold: number;
      windowHours: number;
      ts: number;
    }>,
  },
} as const;

/**
 * Typed initializers for complex state patterns
 * These functions provide type-safe ways to initialize complex state
 */
export const STATE_INITIALIZERS = {
  /** Create empty typed array */
  emptyArray: <T>(): T[] => [],
  
  /** Create empty typed record */
  emptyRecord: <T>(): Record<string, T> => ({}),
  
  /** Create auth credentials object */
  authCredentials: () => ({ ...DEFAULT_STATES.AUTH.CREDENTIALS }),
  
  /** Create empty quantities record */
  quantities: (): Record<string, number> => ({}),
  
  /** Create capacities object */
  capacities: () => ({
    construction: undefined,
    production: undefined,
    research: undefined,
    citizen: undefined,
  } as {
    construction?: number;
    production?: number;
    research?: number;
    citizen?: number;
  }),
  
  /** Create HUD state for maps */
  mapHud: () => ({
    visible: true,
    selectedSystem: null,
  }),
  
  /** Create performance thresholds array */
  performanceThresholds: () => [] as Array<{
    op?: string;
    p95Ms?: number;
    failRatePct?: number;
  }>,
  
  /** Create performance breaches array */
  performanceBreaches: () => [] as Array<{
    op?: string;
    metric: 'p95Ms' | 'failRatePct';
    value: number;
    threshold: number;
    windowHours: number;
    ts: number;
  }>,
} as const;

/**
 * Common useState patterns as ready-to-use hooks
 * These provide consistent patterns for common state combinations
 */
export const COMMON_STATE_PATTERNS = {
  /** Standard loading + error pattern */
  LOADING_ERROR: {
    loading: DEFAULT_STATES.LOADING.LOADING,
    error: DEFAULT_STATES.ERRORS.NO_ERROR,
  },
  
  /** Email + Password pattern */
  EMAIL_PASSWORD: {
    email: DEFAULT_STATES.AUTH.EMAIL,
    password: DEFAULT_STATES.AUTH.PASSWORD,
  },
  
  /** Fleets management pattern */
  FLEETS_MANAGEMENT: {
    fleets: DEFAULT_STATES.ARRAYS.FLEETS,
    loading: DEFAULT_STATES.LOADING.FLEETS_LOADING,
    isDispatching: DEFAULT_STATES.LOADING.IS_DISPATCHING,
  },
  
  /** Form validation pattern */
  FORM_VALIDATION: {
    isValidating: DEFAULT_STATES.LOADING.VALIDATING_LOCATION,
    error: DEFAULT_STATES.ERRORS.NO_ERROR,
  },
  
  /** Game coordinates pattern */
  COORDINATES: {
    coordinateInput: DEFAULT_STATES.TEXT_INPUTS.COORDINATE_INPUT,
    destinationCoord: DEFAULT_STATES.TEXT_INPUTS.DESTINATION_COORD,
  },
} as const;

/**
 * Utility functions for state management
 */
export const STATE_UTILS = {
  /** Check if array state is empty */
  isEmptyArray: <T>(state: T[]): boolean => state.length === 0,
  
  /** Check if object state is empty */
  isEmptyObject: (state: Record<string, any>): boolean => Object.keys(state).length === 0,
  
  /** Reset state to default */
  resetToDefault: <T>(defaultValue: T): T => 
    Array.isArray(defaultValue) ? [...defaultValue] as T :
    typeof defaultValue === 'object' && defaultValue !== null ? { ...defaultValue } as T :
    defaultValue,
  
  /** Create a safe copy of default state */
  safeDefault: <T>(defaultValue: T): T => {
    if (Array.isArray(defaultValue)) return [...defaultValue] as T;
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return { ...defaultValue } as T;
    }
    return defaultValue;
  },
} as const;

/**
 * Type definitions for better TypeScript support
 */
export type DefaultState = typeof DEFAULT_STATES;
export type StateInitializer = typeof STATE_INITIALIZERS;
export type CommonStatePattern = typeof COMMON_STATE_PATTERNS;
export type StateUtil = typeof STATE_UTILS;

/**
 * Export default for convenience
 */
export default DEFAULT_STATES;