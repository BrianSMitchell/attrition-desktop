# NPC Memory System PRD

## Introduction/Overview

The NPC Memory System will enhance the game's non-player characters (NPCs) with persistent memory capabilities using Supermemory integration. This system will allow NPCs to remember and react to all player interactions, creating more realistic and strategically meaningful relationships between players and NPCs. Each interaction will contribute to a hidden "faction score" that determines how NPCs feel about and respond to players.

## Goals

1. Create more realistic and engaging NPC interactions by having them remember and reference past player actions
2. Add strategic depth by making NPCs' responses contingent on interaction history
3. Establish a persistent memory system that maintains complete interaction records for NPCs
4. Create a hidden faction/relationship scoring system that affects NPC behavior
5. Add more depth to player choices by making NPC interactions have lasting consequences

## User Stories

- As a player, I want NPCs to remember my past actions so that my choices have meaningful long-term consequences
- As a player, I want to be able to build relationships (positive or negative) with NPCs through my actions so that I can develop different strategies for different NPCs
- As a player, I want to see basic indications of NPC attitudes toward me so that I can understand the results of my actions
- As a player, I want NPCs to adjust their trade terms based on our relationship so that building good relations has tangible benefits
- As a player, I want NPCs to remember hostile actions and adjust their defensive strategies accordingly so that combat has strategic depth
- As a player, I want to be able to improve damaged relationships through positive interactions so that I can recover from negative actions

## Functional Requirements

1. Memory Recording
   1.1. The system must record every interaction between players and NPCs using Supermemory
   1.2. Recorded interactions must include: combat events, trade interactions, diplomatic communications, territory expansion near NPC bases, and resource gathering near NPC territories
   1.3. Each memory must store: interaction type, timestamp, relevant quantities (damage dealt, resources traded, etc.), and outcome
   1.4. All memories must be permanently stored and never automatically deleted

2. Relationship Scoring
   2.1. The system must maintain a hidden faction score for each player-NPC pair, ranging from -1000 (extreme hostility) to +1000 (complete trust)
   2.2. Scores must be calculated based on the complete history of interactions
   2.3. Different types of interactions must have different weights in score calculation based on NPC personality types
   2.4. Scores must be updated in real-time after each interaction
   2.5. Negative actions should have significantly higher impact than positive actions (e.g., destroying a base might be -200 points while a favorable trade might be +10)
   2.6. Each NPC type must have defined personality traits that affect how they weigh different interactions:
        - Aggressive NPCs: Weight combat actions more heavily
        - Mercantile NPCs: Weight trade interactions more heavily
        - Diplomatic NPCs: Weight territorial respect and communications more heavily

3. NPC Behavior Modification
   3.1. NPCs must adjust trade prices based on relationship scores
   3.2. NPCs must modify combat behavior (defensive strategies, aggression levels) based on relationship scores
   3.3. NPCs must offer different diplomatic options based on relationship scores
   3.4. All behavior modifications must occur automatically based on relationship scores
   3.5. NPCs must reference specific past interactions in their communications based on memory context:
        - Reference major negative events when hostile (e.g., "Your attack on my base in Region X has not been forgotten")
        - Acknowledge positive history when friendly (e.g., "Your consistent fair trading has earned my trust")
        - Use recent interaction history to inform diplomatic responses
   3.6. Each NPC personality type must have unique dialogue patterns and thresholds for behavior changes:
        - Different relationship score thresholds for friendly/neutral/hostile states
        - Personality-appropriate dialogue and reaction patterns
        - Unique bonuses/penalties based on personality type and relationship score

4. Player Feedback
   4.1. The system must display a basic indication of NPC attitude (friendly/neutral/hostile) to players
   4.2. The display must update in real-time as relationship scores change
   4.3. The exact relationship score must remain hidden from players
   4.4. The system must not reveal the specific calculations or thresholds that determine attitude levels

## Non-Goals (Out of Scope)

- The system will not provide detailed relationship statistics or interaction history to players
- The system will not implement memory or score decay over time
- The system will not allow direct manipulation of relationship scores through means other than gameplay interactions
- The system will not provide NPCs with memories of player-to-player interactions
- The system will not implement cross-NPC memory sharing (each NPC's memories are independent)

## Technical Considerations

1. Integration Requirements
   - Must integrate with Supermemory for permanent memory storage
   - Must integrate with existing game systems (combat, trade, etc.)
   - Must be performant enough to handle real-time updates without impacting game performance

2. Storage Format
   ```typescript
interface NPCMemory {
     containerTag: `npc_${baseId}_player_${playerId}`,
     metadata: {
       type: "interaction" | "combat" | "trade" | "diplomacy" | "territory" | "resource",
       mood: "hostile" | "neutral" | "friendly",
       source: "combat" | "trade" | "diplomacy" | "expansion",
       consequence: "trust_up" | "trust_down" | "neutral",
       impact: number,  // Relationship score impact
       details: {
         location?: string,  // Region/coordinates where interaction occurred
         damageDealt?: number,  // For combat events
         resourcesExchanged?: number,  // For trade events
         territoryDistance?: number,  // For expansion events
         description: string  // Human-readable description for dialogue reference
       },
       npcPersonality: {
         type: "aggressive" | "mercantile" | "diplomatic",
         scoreMultipliers: {
           combat: number,
           trade: number,
           diplomacy: number,
           territory: number
         }
       }
     }
   }
   ```

3. Memory Query Patterns
   - Should use semantic search capabilities of Supermemory for relevant history lookup
   - Should implement caching for frequently accessed relationship scores
   - Should use batch updates where appropriate to minimize API calls

## Success Metrics

1. Technical Metrics
   - Memory system response time < 100ms for score lookups
   - Zero data loss for interaction records
   - 99.9% uptime for memory system

2. Gameplay Metrics
   - Increased average player interaction time with NPCs
   - Greater variety in player-NPC interaction patterns
   - Reduced incidents of "consequence-free" NPC base raiding

## Open Questions

1. What should be the exact thresholds for friendly/neutral/hostile states for each NPC personality type?
2. Should the relationship score impact have distance decay for territory-based events?
3. How should relationship score affect the composition of NPC defensive fleets?
4. What specific dialogue patterns should each NPC personality type use?
5. How frequently should NPCs reference past events in their communications?
