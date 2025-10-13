## Brief overview
This rule ensures all game functionality development is aligned with canonical game mechanics specifications. Before implementing any game features, the agent must consult the authoritative Game Mechanics and Rules document to maintain consistency and accuracy.

## Game mechanics consultation requirement
- **MANDATORY**: Always read `docs/Game Mechanics and Rules.md` before implementing any game functionality
- **SCOPE**: Applies to all game-related development including buildings, units, technologies, combat, economy, and UI features
- **PURPOSE**: Ensures implementation matches canonical specifications from source code and in-game help systems

## Implementation workflow
- **Pre-implementation**: Read relevant sections of the Game Mechanics document
- **Verification**: Cross-reference implementation against documented formulas, requirements, and mechanics
- **Consistency**: Ensure new features align with existing game balance and progression systems
- **Documentation**: Update the Game Mechanics document if new mechanics are introduced

## Trigger cases
- Adding new buildings, units, or technologies
- Implementing combat mechanics or fleet systems
- Developing economic features or resource management
- Creating UI components that display game statistics
- Modifying existing game systems or balance

## Source file integration
- **Primary Reference**: `docs/Game Mechanics and Rules.md` (single source of truth)
- **Supporting Files**: Canonical data from `packages/shared/src/` (tech.ts, buildings.ts, units.ts, etc.)
- **Validation**: Cross-reference with in-game help systems and UI components

## Quality assurance
- **Formula Accuracy**: Ensure all calculations match documented formulas
- **Balance Consistency**: Maintain game balance as specified in mechanics document
- **UI Alignment**: Ensure user interface reflects correct game mechanics
- **Data Integrity**: Verify all game data matches canonical specifications
