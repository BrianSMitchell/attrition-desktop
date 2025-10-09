/**
 * NPC personality types and their interaction preferences
 */
export enum NPCPersonalityType {
  AGGRESSIVE = 'aggressive',
  MERCANTILE = 'mercantile',
  DIPLOMATIC = 'diplomatic'
}

/**
 * Types of interactions that can be recorded
 */
export enum InteractionType {
  COMBAT = 'combat',
  TRADE = 'trade',
  DIPLOMACY = 'diplomacy',
  TERRITORY = 'territory',
  RESOURCE = 'resource'
}

/**
 * Source of the interaction
 */
export enum InteractionSource {
  COMBAT = 'combat',
  TRADE = 'trade',
  DIPLOMACY = 'diplomacy',
  EXPANSION = 'expansion'
}

/**
 * The emotional state or mood of the NPC during/after an interaction
 */
export enum NPCMood {
  HOSTILE = 'hostile',
  NEUTRAL = 'neutral',
  FRIENDLY = 'friendly'
}

/**
 * The impact of an interaction on trust/relationship
 */
export enum TrustConsequence {
  TRUST_UP = 'trust_up',
  TRUST_DOWN = 'trust_down',
  NEUTRAL = 'neutral'
}

/**
 * Interface for interaction details with optional type-specific fields
 */
export interface InteractionDetails {
  location?: string;       // Region/coordinates where interaction occurred
  damageDealt?: number;    // For combat events
  resourcesExchanged?: number;  // For trade events
  territoryDistance?: number;   // For expansion events
  description: string;     // Human-readable description for dialogue reference
}

/**
 * Configuration for how an NPC personality type weights different interactions
 */
export interface PersonalityWeights {
  combat: number;
  trade: number;
  diplomacy: number;
  territory: number;
}

/**
 * Complete memory record for an NPC-player interaction
 */
export interface NPCMemory {
  containerTag: `npc_${string}_player_${string}`;
  metadata: {
    type: InteractionType;
    mood: NPCMood;
    source: InteractionSource;
    consequence: TrustConsequence;
    impact: number;  // Relationship score impact
    details: InteractionDetails;
    npcPersonality: {
      type: NPCPersonalityType;
      scoreMultipliers: PersonalityWeights;
    };
  };
}

/**
 * Service interface for NPC memory operations
 */
export interface INPCMemoryService {
  recordInteraction(params: {
    npcId: string;
    playerId: string;
    type: InteractionType;
    details: InteractionDetails;
  }): Promise<void>;

  getRelationship(npcId: string, playerId: string): Promise<number>;
  
  queryMemories(params: {
    npcId: string;
    playerId: string;
    type?: InteractionType;
    limit?: number;
  }): Promise<NPCMemory[]>;
}

/**
 * Service interface for NPC personality management
 */
export interface INPCPersonalityService {
  getPersonalityType(npcId: string): Promise<NPCPersonalityType>;
  
  getInteractionWeights(npcId: string): Promise<PersonalityWeights>;
  
  calculateImpact(params: {
    npcId: string;
    type: InteractionType;
    baseImpact: number;
  }): Promise<number>;
}

/**
 * Service interface for NPC relationship calculations
 */
export interface INPCRelationshipService {
  calculateRelationshipScore(params: {
    npcId: string;
    playerId: string;
    memories: NPCMemory[];
  }): Promise<number>;
  
  getRelationshipStatus(score: number): NPCMood;
  
  getPriceAdjustment(score: number): number;
  
  getCombatBonus(score: number): number;
}

/**
 * Configuration options for the NPC memory system
 */
export interface NPCMemoryConfig {
  relationshipRange: {
    min: number;    // Minimum relationship score (e.g., -1000)
    max: number;    // Maximum relationship score (e.g., 1000)
  };
  thresholds: {
    hostile: number;  // Score below this is considered hostile
    friendly: number; // Score above this is considered friendly
  };
  weights: {
    combat: number;
    trade: number;
    diplomacy: number;
    territory: number;
  };
}