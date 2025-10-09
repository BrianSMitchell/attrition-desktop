// Core game types and interfaces

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

export interface Empire {
  _id: string;
  userId: string;
  name: string;
  homeSystem?: string; // coordinate like A00:10:22:10
  territories: string[]; // list of coordinates
  baseCount: number; // Track number of bases for colonization cost calculation
  hasDeletedBase: boolean; // Track if empire gets 25% colonization discount
  resources: {
    credits: number;
    energy: number;
  };
  lastResourceUpdate?: Date;
  lastCreditPayout?: Date;
  creditsRemainderMilli: number;
  // Map of TechnologyKey -> level
  techLevels?: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StarSystem {
  _id: string;
  name: string;
  coordinates: {
    x: number;
    y: number;
  };
  planets: Planet[];
  owner?: string; // Empire ID
  resources: {
    minerals: number;
    energy: number;
  };
  defenseLevel: number;
}

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

export interface Fleet {
  _id: string;
  empireId: string;
  name: string;
  ships: Ship[];
  location: {
    systemId: string;
    coordinates: {
      x: number;
      y: number;
    };
  };
  destination?: {
    systemId: string;
    coordinates: {
      x: number;
      y: number;
    };
  };
  status: 'idle' | 'moving' | 'in_combat' | 'exploring';
}

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

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  details?: any;
  reasons?: string[];
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  /** Access token (JWT) used for API and Socket.IO authentication. */
  token: string;
  /** Refresh token (longer-lived) used to obtain new access tokens. */
  refreshToken: string;
  empire?: Empire;
}

/** Request payload for refreshing tokens */
export interface RefreshRequest {
  refreshToken: string;
}

/** Response payload for refreshing tokens */
export interface RefreshResponse {
  /** New access token (JWT) */
  token: string;
  /** Rotated refresh token */
  refreshToken: string;
  /** Current user snapshot for convenience */
  user: Omit<User, 'passwordHash'>;
  /** Optional empire snapshot */
  empire?: Empire;
}

// Game action types
export interface GameAction {
  type: string;
  payload: any;
  timestamp: Date;
  empireId: string;
}

// New hierarchical coordinate system
export interface CoordinateComponents {
  server: string;
  galaxy: number;
  region: number;
  system: number;
  body: number;
}

// Legacy coordinate system (keeping for backward compatibility)
export interface Coordinates {
  x: number;
  y: number;
}

// Universe structure types
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
    recyclers: {
      empireId: string;
      startedAt: Date;
    }[];
  };
  owner: string | null; // User._id
}

export interface StarSystem {
  id: number;
  position: number; // 0-99 position in region grid
  celestialBodies: CelestialBody[];
}

export interface Region {
  id: number;
  starSystems: StarSystem[];
}

export interface Galaxy {
  id: number;
  regions: Region[];
}

export interface UniverseDocument {
  serverName: string;
  galaxies: Galaxy[];
  createdAt: Date;
  updatedAt: Date;
}

 // Alternative flattened location model
export interface StarProperties {
  spectralClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  color: string;           // Hex or rgb
  temperatureK: number;
  massSolar: number;
  luminositySolar: number;
  effects?: {
    fertilityMultiplier?: number;
    energyMultiplier?: number;
    researchMultiplier?: number;
  };
}

export interface Location {
  coord: string; // "A00:10:22:10"
  type: 'planet' | 'asteroid' | 'star';
  // For planets/asteroids
  properties?: {
    fertility: number;
    resources: {
      metal: number;
      energy: number;
      research: number;
    };
  };
  // For stars
  starProperties?: StarProperties;
  // Space debris fields
  debris?: {
    amount: number;
    generationRate: number;
    recyclers: {
      empireId: string;
      startedAt: Date;
    }[];
  };
  owner: string | null; // User._id
  createdAt: Date;
}

export interface GameState {
  currentUser?: Omit<User, 'passwordHash'>;
  currentEmpire?: Empire;
  universe?: Universe;
  visibleSystems: StarSystem[];
  fleets: Fleet[];
}

// Building and Infrastructure types
export interface Building {
  _id: string;
  locationCoord: string;
  empireId: string;
  type: BuildingType;
  /** Human-readable name from catalog, e.g., "Urban Structures", "Gas Plants". */
  displayName?: string;
  /** Original catalog key when created from the catalog. */
  catalogKey?: import('./buildings').BuildingKey;
  level: number;
  constructionStarted: Date;
  constructionCompleted?: Date;
  isActive: boolean;
  resourceCost: ResourceCost;
  maintenanceCost: ResourceCost;
}

export type BuildingType = 
  | 'metal_mine' 
  | 'energy_plant'
  | 'factory' 
  | 'research_lab' 
  | 'defense_station' 
  | 'shipyard' 
  | 'command_center'
  | 'habitat';

export interface ResourceCost {
  credits: number;
  energyDelta?: number; // Net energy change (positive produces, negative consumes)
}

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
    buildings?: { type: BuildingType; level: number }[];
  };
}

/**
 * Economic production rates for credits-only economy model.
 */
export interface EconomicProduction {
  /** Credits generated per hour (economy). */
  creditsPerHour: number;
}

export interface Technology {
  military: number;
  economic: number;
  exploration: number;
}

/**
 * Generalized technology prerequisite used for shared requirement typing.
 * Uses inline type import to avoid runtime import/circulars.
 */
export interface TechnologyPrereqRef {
  key: import('./tech').TechnologyKey;
  level: number;
}

/**
 * Requirements for constructing structures.
 * - credits: upfront cost
 * - energyDelta: net energy change (positive produces, negative consumes)
 * - populationRequired: population needed to operate
 * - areaRequired: optional area consumption requirement
 * - techPrereqs: technology gates
 * - minLabLevel/minShipyardLevel: minimum facility levels if applicable
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
 * Requirements for starting research.
 * - credits: upfront cost
 * - minLabLevel: minimum labs at the base
 * - techPrereqs: prerequisite technologies
 */
export interface ResearchRequirements {
  credits: number;
  minLabLevel?: number;
  techPrereqs: TechnologyPrereqRef[];
}

/**
 * Requirements for producing units.
 * - credits: upfront cost
 * - minShipyardLevel: minimum shipyard level(s)
 * - techPrereqs: prerequisite technologies
 */
export interface UnitRequirements {
  credits: number;
  minShipyardLevel?: number;
  techPrereqs: TechnologyPrereqRef[];
}

/** Economy rate (credits per hour) derived from structures/effects. */
export type EconomyRate = number;

// Colony and Territory Management
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

// Research and Technology
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

// Fleet and Ship Management
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
    buildings: { type: BuildingType; level: number }[];
  };
}

// Game Events and Actions
export interface GameEvent {
  _id: string;
  type: 'resource_production' | 'building_completed' | 'research_completed' | 'fleet_arrived' | 'attack' | 'trade';
  empireId: string;
  data: any;
  timestamp: Date;
  processed: boolean;
}

export interface ResourceTransaction {
  _id: string;
  empireId: string;
  type: 'production' | 'construction' | 'research' | 'trade' | 'maintenance';
  resources: Partial<ResourceCost>;
  description: string;
  timestamp: Date;
}

// API Request/Response types for new features
export interface BuildingConstructionRequest {
  locationCoord: string;
  buildingType: BuildingType;
}

export interface ResearchStartRequest {
  researchType: 'military' | 'economic' | 'exploration';
  projectName: string;
}

export interface FleetMoveRequest {
  fleetId: string;
  destinationCoord: string;
  purpose: 'explore' | 'attack' | 'transport' | 'colonize';
}

export interface ColonizeRequest {
  locationCoord: string;
  colonyName: string;
}

export interface ResourceUpdateResponse {
  empire: Empire;
  resourcesGained: Partial<ResourceCost>;
  creditsPerHour: number;
}

// Real-time Socket Events
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
