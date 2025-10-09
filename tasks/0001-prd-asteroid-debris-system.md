# Asteroid Debris System PRD

## Introduction
This document outlines the requirements for converting asteroids from colonizable objects to debris-generating resource points in Attrition. This change aims to create more dynamic early-game resource generation and encourage player competition over asteroid control.

## Goals
1. Create a more active resource collection system around asteroids
2. Encourage player competition over asteroid control
3. Provide meaningful early-game income generation opportunities
4. Create strategic decisions around recycler unit placement and asteroid control

## User Stories
- As a player, I want to collect debris from asteroids using recycler units to generate income for my empire
- As a player, I want to compete with other players for control over lucrative asteroid debris fields
- As a player, I want to find asteroids that generate debris at different rates to make strategic decisions about which ones to control

## Functional Requirements

### Asteroid Mechanics
1. Asteroids must no longer be colonizable by any means
2. Each asteroid must generate debris at a random rate
3. Debris must accumulate at the asteroid's location indefinitely if not collected
4. There must be no upper limit to how much debris can accumulate at an asteroid
5. Debris must persist until collected (no decay or disappearance)

### Recycler Unit Mechanics
1. Recycler units must automatically collect debris when landed on an asteroid
2. Collection rate must be set to 10 debris per second per recycler
3. Each piece of debris collected must convert to 1 credit for the controlling player's empire
4. Multiple recycler units from different players must be able to collect from the same asteroid simultaneously
5. When multiple recyclers are present, they must each collect at their full rate (10/second) until debris is depleted

### Resource Generation and Collection
1. Each asteroid must have its own independent debris generation rate
2. Generated debris must be added to the asteroid's accumulated debris count
3. Debris collection must occur automatically when recyclers are present
4. Collection must happen in real-time without player intervention
5. Credits must be immediately added to the player's account upon debris collection

### System Changes
1. All existing asteroid colonies must be removed from the game
2. Current colonization mechanics for asteroids must be disabled
3. UI must be updated to show:
   - Current debris amount at each asteroid
   - Debris generation rate (if visible to players)
   - Number of recyclers currently collecting at the asteroid

## Non-Goals (Out of Scope)
- No changes to recycler unit movement or combat mechanics
- No changes to other resource generation methods
- No changes to other colonizable celestial bodies
- No changes to recycler unit construction or cost

## Technical Considerations
1. Need to modify asteroid object properties to:
   - Remove colonization capability
   - Add debris generation rate
   - Add accumulated debris counter
2. Need to modify recycler unit code to:
   - Add debris collection functionality
   - Add credit generation from debris
   - Handle multiple recyclers at the same location
3. Need to handle the transition by removing existing asteroid colonies

## Success Metrics
1. Increased player interaction around asteroids
2. More dynamic early-game economy
3. Strategic competition over high-value asteroids
4. Reduced early-game resource imbalances

## Open Questions
1. Should debris generation rates be visible to players?
2. Should there be a visual indication of accumulated debris amount?
3. Should the UI show estimated credits per minute based on debris generation rate?
4. Should there be any way to increase debris generation rate at an asteroid?