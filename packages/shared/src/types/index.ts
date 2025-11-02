/**
 * Comprehensive Type Definitions for Attrition Game
 * 
 * This file serves as the single source of truth for all exported types
 * in the shared package. It consolidates types from various modules and
 * provides clear categorization and documentation.
 * 
 * Organization:
 * 1. Authentication & User Management
 * 2. Empire & Game State
 * 3. Universe Structure
 * 4. Locations & Coordinates
 * 5. Buildings & Infrastructure
 * 6. Technology & Research
 * 7. Units & Fleet
 * 8. Resources & Economy
 * 9. Events & Logs
 * 10. API Response Types
 * 11. Socket Events
 * 12. Message System
 * 13. Validation & Schemas
 */

// ============================================================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ============================================================================

/**
 * User account in the system
 */
export interface User {
  _id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLogin: Date;
  gameProfile: {
    empireId: string;
    credits: number;
    experience: number;
    startingCoordinate?: string;
  };
}

/**
 * Authentication request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * User registration request
 */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  /** Access token (JWT) used for API and Socket.IO authentication */
  token: string;
  /** Refresh token (longer-lived) used to obtain new access tokens */
  refreshToken: string;
  empire?: Empire;
}

/**
 * Token refresh request
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  /** New access token (JWT) */
  token: string;
  /** Rotated refresh token */
  refreshToken: string;
  /** Current user snapshot */
  user: Omit<User, 'passwordHash'>;
  /** Optional empire snapshot */
  empire?: Empire;
}

// ============================================================================
// 2. EMPIRE & GAME STATE
// ============================================================================

/**
 * Empire: player-controlled faction in the game
 */
export interface Empire {
  _id: string;
  userId: string;
  name: string;
  homeSystem?: string; // coordinate like "A00:10:22:10"
  territories: string[]; // list of coordinates
  baseCount: number; // Track number of bases for colonization cost
  hasDeletedBase: boolean; // Track if empire gets 25% colonization discount
  resources: {
    credits: number;
    energy: number;
  };
  lastResourceUpdate?: Date;
  lastCreditPayout?: Date;
  creditsRemainderMilli: number;
  /** Map of TechnologyKey -> level */
  techLevels?: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Complete game state for a player
 */
export interface GameState {
  currentUser?: Omit<User, 'passwordHash'>;
  currentEmpire?: Empire;
  universe?: Universe;
  visibleSystems: StarSystem[];
  fleets: Fleet[];
}

/**
 * Game action logged in history
 */
export interface GameAction {
  type: string;
  payload: any;
  timestamp: Date;
  empireId: string;
}

// ============================================================================
// 3. UNIVERSE STRUCTURE
// ============================================================================

/**
 * Complete universe document
 */
export interface Universe {
  _id: string;
  name: string;
  size: {
    width: number;
    height: number;
  };
  systems: string[]; // System IDs
  createdAt: Date;
  gameSettings: {
    maxPlayers: number;
    gameSpeed: number;
    startingResources: {
      credits: number;
      minerals: number;
      energy: number;
    };
  };
}

/**
 * Galaxy: top-level container in hierarchical structure
 */
export interface Galaxy {
  id: number;
  regions: Region[];
}

/**
 * Region: container for star systems (100 systems)
 */
export interface Region {
  id: number;
  starSystems: StarSystem[];
}

/**
 * Star system: container for celestial bodies (100 bodies)
 */
export interface StarSystem {
  id: number;
  position: number; // 0-99 position in region grid
  celestialBodies: CelestialBody[];
  /** Legacy support: original StarSystem interface */
  _id?: string;
  name?: string;
  coordinates?: { x: number; y: number };
  planets?: Planet[];
  owner?: string; // Empire ID
  resources?: { minerals: number; energy: number };
  defenseLevel?: number;
}

/**
 * Celestial body: planet or asteroid
 */
export interface CelestialBody {
  id: number;
  type: 'planet' | 'asteroid';
  fertility: number;
  resources: {
    metal: number;
    energy: number;
    research: number;
  };
  debris?: {
    amount: number;
    generationRate: number;
    recyclers: Array<{
      empireId: string;
      startedAt: Date;
    }>;
  };
  owner: string | null; // User._id
}

/**
 * Flattened location model for simplified access
 */
export interface Location {
  coord: string; // "A00:10:22:10"
  type: 'planet' | 'asteroid' | 'star';
  properties?: {
    fertility: number;
    resources: {
      metal: number;
      energy: number;
      research: number;
    };
  };
  starProperties?: StarProperties;
  debris?: {
    amount: number;
    generationRate: number;
    recyclers: Array<{
      empireId: string;
      startedAt: Date;
    }>;
  };
  owner: string | null;
  createdAt: Date;
}

/**
 * Star properties affecting production
 */
export interface StarProperties {
  spectralClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  color: string; // Hex or rgb
  temperatureK: number;
  massSolar: number;
  luminositySolar: number;
  effects?: {
    fertilityMultiplier?: number;
    energyMultiplier?: number;
    researchMultiplier?: number;
  };
}

// ============================================================================
// 4. LOCATIONS & COORDINATES
// ============================================================================

/**
 * Hierarchical coordinate components
 */
export interface CoordinateComponents {
  server: string;
  galaxy: number;
  region: number;
  system: number;
  body: number;
}

/**
 * Legacy 2D coordinates (backward compatibility)
 */
export interface Coordinates {
  x: number;
  y: number;
}

// ============================================================================
// 5. BUILDINGS & INFRASTRUCTURE
// ============================================================================

/**
 * Building types in the game
 */
export type BuildingType =
  | 'metal_mine'
  | 'energy_plant'
  | 'factory'
  | 'research_lab'
  | 'defense_station'
  | 'shipyard'
  | 'command_center'
  | 'habitat';

/**
 * Building instance on a planet
 */
export interface Building {
  _id: string;
  locationCoord: string;
  empireId: string;
  type: BuildingType;
  /** Human-readable name from catalog */
  displayName?: string;
  /** Original catalog key when created */
  catalogKey?: string;
  level: number;
  constructionStarted: Date;
  constructionCompleted?: Date;
  isActive: boolean;
  resourceCost: ResourceCost;
  maintenanceCost: ResourceCost;
}

/**
 * Building template definition
 */
export interface BuildingTemplate {
  type: BuildingType;
  name: string;
  description: string;
  baseCost: ResourceCost;
  baseProduction: Partial<EconomicProduction>;
  maxLevel: number;
  constructionTime: number; // in minutes
  requirements?: {
    technology?: Partial<Technology>;
    buildings?: Array<{ type: BuildingType; level: number }>;
  };
}

/**
 * Colony: settlement with buildings
 */
export interface Colony {
  _id: string;
  empireId: string;
  locationCoord: string;
  name: string;
  buildings: string[]; // Building IDs
  resourceStorage: {
    metal: number;
    energy: number;
    research: number;
    maxMetal: number;
    maxEnergy: number;
    maxResearch: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to construct a building
 */
export interface BuildingConstructionRequest {
  locationCoord: string;
  buildingType: BuildingType;
}

// ============================================================================
// 6. TECHNOLOGY & RESEARCH
// ============================================================================

/**
 * Technology levels across three tracks
 */
export interface Technology {
  military: number;
  economic: number;
  exploration: number;
}

/**
 * Technology prerequisite reference
 */
export interface TechnologyPrereqRef {
  key: string; // TechnologyKey
  level: number;
}

/**
 * Research project in progress
 */
export interface ResearchProject {
  _id: string;
  empireId: string;
  type: 'military' | 'economic' | 'exploration';
  name: string;
  description: string;
  researchCost: number;
  researchProgress: number;
  isCompleted: boolean;
  startedAt: Date;
  completedAt?: Date;
  benefits: {
    resourceBonus?: Partial<EconomicProduction>;
    buildingUnlock?: BuildingType[];
    shipUnlock?: string[];
    other?: string[];
  };
}

/**
 * Request to start research
 */
export interface ResearchStartRequest {
  researchType: 'military' | 'economic' | 'exploration';
  projectName: string;
}

/**
 * Requirements for starting research
 */
export interface ResearchRequirements {
  credits: number;
  minLabLevel?: number;
  techPrereqs: TechnologyPrereqRef[];
}

// ============================================================================
// 7. UNITS & FLEET
// ============================================================================

/**
 * Fleet: collection of ships
 */
export interface Fleet {
  _id: string;
  empireId: string;
  name: string;
  ships: Ship[];
  location: {
    systemId: string;
    coordinates: { x: number; y: number };
  };
  destination?: {
    systemId: string;
    coordinates: { x: number; y: number };
  };
  status: 'idle' | 'moving' | 'in_combat' | 'exploring';
}

/**
 * Ship in a fleet
 */
export interface Ship {
  _id: string;
  type: 'scout' | 'fighter' | 'cruiser' | 'battleship' | 'transport';
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  cargo?: {
    minerals: number;
    energy: number;
    capacity: number;
  };
}

/**
 * Ship design template
 */
export interface ShipTemplate {
  type: string;
  name: string;
  description: string;
  cost: ResourceCost;
  constructionTime: number;
  stats: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
    cargoCapacity?: number;
  };
  requirements: {
    technology: Partial<Technology>;
    buildings: Array<{ type: BuildingType; level: number }>;
  };
}

/**
 * Fleet movement record
 */
export interface FleetMovement {
  _id: string;
  fleetId: string;
  fromCoord: string;
  toCoord: string;
  startTime: Date;
  arrivalTime: Date;
  purpose: 'explore' | 'attack' | 'transport' | 'colonize';
  status: 'traveling' | 'arrived' | 'cancelled';
}

/**
 * Request to move fleet
 */
export interface FleetMoveRequest {
  fleetId: string;
  destinationCoord: string;
  purpose: 'explore' | 'attack' | 'transport' | 'colonize';
}

/**
 * Requirements for producing ships
 */
export interface UnitRequirements {
  credits: number;
  minShipyardLevel?: number;
  techPrereqs: TechnologyPrereqRef[];
}

// ============================================================================
// 8. RESOURCES & ECONOMY
// ============================================================================

/**
 * Resource cost (credits, energy, etc.)
 */
export interface ResourceCost {
  credits: number;
  energyDelta?: number; // positive = produces, negative = consumes
}

/**
 * Economic production rates
 */
export interface EconomicProduction {
  /** Credits generated per hour */
  creditsPerHour: number;
}

/**
 * Economy rate type
 */
export type EconomyRate = number;

/**
 * Resource transaction record
 */
export interface ResourceTransaction {
  _id: string;
  empireId: string;
  type: 'production' | 'construction' | 'research' | 'trade' | 'maintenance';
  resources: Partial<ResourceCost>;
  description: string;
  timestamp: Date;
}

/**
 * Response with updated resources
 */
export interface ResourceUpdateResponse {
  empire: Empire;
  resourcesGained: Partial<ResourceCost>;
  creditsPerHour: number;
}

// ============================================================================
// 9. EVENTS & LOGS
// ============================================================================

/**
 * Game event that occurred
 */
export interface GameEvent {
  _id: string;
  type:
    | 'resource_production'
    | 'building_completed'
    | 'research_completed'
    | 'fleet_arrived'
    | 'attack'
    | 'trade';
  empireId: string;
  data: any;
  timestamp: Date;
  processed: boolean;
}

// ============================================================================
// 10. API RESPONSE TYPES
// ============================================================================

/**
 * Basic API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: any;
  reasons?: string[];
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// 11. SOCKET EVENTS
// ============================================================================

/**
 * Socket.IO event definitions
 */
export interface SocketEvents {
  // Client to Server
  'join-empire-room': { empireId: string };
  'leave-empire-room': { empireId: string };
  'request-resource-update': {};

  // Server to Client
  'resource-update': ResourceUpdateResponse;
  'building-completed': { building: Building; colony: Colony };
  'research-completed': { research: ResearchProject; empire: Empire };
  'fleet-arrived': { fleet: Fleet; movement: FleetMovement };
  'empire-attacked': { attackerName: string; locationCoord: string; damage: number };
  'new-colony-established': { colony: Colony; empire: Empire };
}

// ============================================================================
// 12. MESSAGE SYSTEM
// ============================================================================

/**
 * Message severity level
 */
export type MessageSeverity = 'success' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Message category for organization
 */
export type MessageCategory =
  | 'auth'
  | 'empire'
  | 'building'
  | 'research'
  | 'fleet'
  | 'combat'
  | 'resource'
  | 'trade'
  | 'diplomacy'
  | 'exploration'
  | 'system'
  | 'validation'
  | 'network';

/**
 * Game message
 */
export interface GameMessage {
  id: string;
  category: MessageCategory;
  severity: MessageSeverity;
  message: string;
  description?: string;
  code?: string;
  context?: MessageContext;
  persistent?: boolean;
  timeout?: number;
  actions?: MessageAction[];
}

/**
 * Message action
 */
export interface MessageAction {
  id: string;
  label: string;
  style?: 'primary' | 'secondary' | 'danger';
  handler?: () => void;
  dismissAfterAction?: boolean;
  params?: Record<string, any>;
}

/**
 * Message context
 */
export interface MessageContext {
  timestamp?: Date;
  userId?: string;
  empireId?: string;
  locationCoord?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

// ============================================================================
// 13. VALIDATION & REQUIREMENTS
// ============================================================================

/**
 * Structure requirements for construction
 */
export interface StructureRequirements {
  credits: number;
  energyDelta: number;
  populationRequired: number;
  areaRequired?: number;
  techPrereqs: TechnologyPrereqRef[];
  minLabLevel?: number;
  minShipyardLevel?: number;
}

/**
 * Colonization request
 */
export interface ColonizeRequest {
  locationCoord: string;
  colonyName: string;
}

// ============================================================================
// LEGACY SUPPORT
// ============================================================================

/**
 * Legacy Planet interface (kept for backward compatibility)
 */
export interface Planet {
  _id: string;
  name: string;
  type: 'terrestrial' | 'gas_giant' | 'ice' | 'desert' | 'volcanic';
  size: 'small' | 'medium' | 'large';
  population: number;
  infrastructure: {
    mines: number;
    factories: number;
    research_labs: number;
    defense_stations: number;
  };
  resources: {
    minerals: number;
    energy: number;
  };
}

/**
 * Re-export all types from sub-modules for convenience
 */
export * from '../api/types';
export * from '../messages/types';
export * from '../types/test-types';
