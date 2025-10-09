import {
  NPCPersonalityType,
  InteractionType,
  InteractionSource,
  NPCMood,
  TrustConsequence,
  type NPCMemory,
  type InteractionDetails,
  type PersonalityWeights
} from '../types';

describe('Type Definitions', () => {
  describe('Enums', () => {
    it('should have correct NPCPersonalityType values', () => {
      expect(Object.values(NPCPersonalityType)).toEqual([
        'aggressive',
        'mercantile',
        'diplomatic'
      ]);
    });

    it('should have correct InteractionType values', () => {
      expect(Object.values(InteractionType)).toEqual([
        'combat',
        'trade',
        'diplomacy',
        'territory',
        'resource'
      ]);
    });

    it('should have correct InteractionSource values', () => {
      expect(Object.values(InteractionSource)).toEqual([
        'combat',
        'trade',
        'diplomacy',
        'expansion'
      ]);
    });

    it('should have correct NPCMood values', () => {
      expect(Object.values(NPCMood)).toEqual([
        'hostile',
        'neutral',
        'friendly'
      ]);
    });

    it('should have correct TrustConsequence values', () => {
      expect(Object.values(TrustConsequence)).toEqual([
        'trust_up',
        'trust_down',
        'neutral'
      ]);
    });
  });

  describe('Interfaces', () => {
    it('should allow valid InteractionDetails object', () => {
      const details: InteractionDetails = {
        location: 'A00:51:09',
        damageDealt: 1000,
        description: 'Player attacked NPC base'
      };

      expect(details).toBeDefined();
      expect(details.description).toBe('Player attacked NPC base');
    });

    it('should allow valid PersonalityWeights object', () => {
      const weights: PersonalityWeights = {
        combat: 1.5,
        trade: 1.0,
        diplomacy: 0.8,
        territory: 1.2
      };

      expect(weights).toBeDefined();
      expect(weights.combat).toBe(1.5);
    });

    it('should allow valid NPCMemory object', () => {
      const memory: NPCMemory = {
        containerTag: 'npc_base123_player_empire456',
        metadata: {
          type: InteractionType.COMBAT,
          mood: NPCMood.HOSTILE,
          source: InteractionSource.COMBAT,
          consequence: TrustConsequence.TRUST_DOWN,
          impact: -200,
          details: {
            location: 'A00:51:09',
            damageDealt: 1000,
            description: 'Player attacked NPC base'
          },
          npcPersonality: {
            type: NPCPersonalityType.AGGRESSIVE,
            scoreMultipliers: {
              combat: 1.5,
              trade: 1.0,
              diplomacy: 0.8,
              territory: 1.2
            }
          }
        }
      };

      expect(memory).toBeDefined();
      expect(memory.metadata.impact).toBe(-200);
      expect(memory.metadata.npcPersonality.type).toBe(NPCPersonalityType.AGGRESSIVE);
    });
  });

  // Type compilation tests
  describe('Type Constraints', () => {
    it('should enforce NPCMemory containerTag format', () => {
      const memory: NPCMemory = {
        containerTag: 'npc_base123_player_empire456',
        metadata: {
          type: InteractionType.COMBAT,
          mood: NPCMood.HOSTILE,
          source: InteractionSource.COMBAT,
          consequence: TrustConsequence.TRUST_DOWN,
          impact: -200,
          details: {
            description: 'Test memory'
          },
          npcPersonality: {
            type: NPCPersonalityType.AGGRESSIVE,
            scoreMultipliers: {
              combat: 1.5,
              trade: 1.0,
              diplomacy: 0.8,
              territory: 1.2
            }
          }
        }
      };

      expect(memory.containerTag).toMatch(/^npc_.*_player_.*$/);
    });

    it('should require all PersonalityWeights fields', () => {
      const weights: PersonalityWeights = {
        combat: 1.5,
        trade: 1.0,
        diplomacy: 0.8,
        territory: 1.2
      };

      // Verify all required fields are present
      expect(Object.keys(weights).sort()).toEqual(
        ['combat', 'trade', 'diplomacy', 'territory'].sort()
      );
    });

    it('should require description in InteractionDetails', () => {
      const details: InteractionDetails = {
        location: 'A00:51:09',
        damageDealt: 1000,
        description: 'Test interaction'
      };

      // Verify description is present
      expect(details.description).toBeDefined();
      expect(typeof details.description).toBe('string');
    });
  });
});