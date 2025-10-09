# NPC Memory Service

## Overview

The NPC Memory Service provides persistent memory capabilities for NPCs in Attrition using Supermemory integration. This system allows NPCs to remember and react to all player interactions, creating more realistic and strategically meaningful relationships between players and NPCs.

## Features

- Persistent memory storage for NPC interactions
- Relationship scoring system (-1000 to +1000)
- NPC personality types affecting behavior
- Memory-based dialogue generation
- Context-aware response system

## Installation

```bash
npm install
```

## Configuration

Required environment variables:
```env
SUPERMEMORY_API_KEY=your_api_key
SUPERMEMORY_URL=https://api.supermemory.ai/v1
```

## Usage

```typescript
import { NPCMemoryService } from '@attrition/npc-memory-service';

// Initialize service
const memoryService = new NPCMemoryService();

// Record an interaction
await memoryService.recordInteraction({
  npcId: 'base_123',
  playerId: 'empire_456',
  type: 'combat',
  details: {
    location: 'A00:51:09',
    damageDealt: 1000
  }
});

// Get NPC's relationship with player
const relationship = await memoryService.getRelationship('base_123', 'empire_456');
```

## Architecture

The service is composed of several key components:

- **NPCMemoryService**: Core service for memory operations
- **NPCRelationshipService**: Handles relationship scoring
- **NPCPersonalityService**: Manages NPC personality types
- **SupermemoryClient**: Typed wrapper for Supermemory API

## Testing

```bash
npm test                 # Run all tests
npm test:watch          # Run tests in watch mode
npm test:coverage       # Run tests with coverage
```

## Contributing

1. Create feature branch (`git checkout -b feature/xyz`)
2. Make changes
3. Run tests (`npm test`)
4. Create PR

## License

Internal use only - Attrition Game