# Universe Overhaul: Star Types, Terrains, and Astro Position Data

This document outlines the planned overhaul of the universe generator. The current generator produces stars, planets, and asteroids; the updated system will:
- Generate specific star types and planet terrains
- Apply star-type-based positional modifiers (to base Solar Energy and Fertility at positions 1–8)
- Randomize star types and planet terrains independently (any planet type can orbit any star type)
- Update the database schema to track the new types and attributes

Once the DB schema is updated, the old universe will be permanently deleted and a new one generated. This includes deleting all active users to start fresh and avoid backfilling complexities.

## Migration and Implementation Notes

- Update DB schema to include:
  - Star: type, system-level modifiers, and derived values influencing orbits
  - Planet (Terrain): terrain type, resource yields (Metal, Gas, Crystals), Fertility, Area (Planet/Moon), orbit position, links to star/system
  - Orbit Position: positional modifiers (Solar Energy, Fertility) computed as base + star-type modifiers
- Regeneration plan:
  - Delete existing universe data
  - Delete users (clean slate)
  - Generate new systems with random star types and random planet terrains
- Rules:
  - Star type and planet terrain randomness are independent
  - Star-type modifiers are additive to base positional values unless otherwise noted

---

## Terrains (Planetary and Asteroid) Baseline

The following table lists terrain (planet/asteroid) baseline resources and area percentages. These are inherent to the terrain and can be further modified by positional effects and star types.

| Terrain      | Metal | Gas | Crystals | Fertility | Area Planet | Area Moon |
|--------------|:-----:|:---:|:--------:|:---------:|:-----------:|:---------:|
| Arid         |   3   |  3  |    0     |     5     |     95      |    83     |
| Asteroid     |   4   |  2  |    2     |     4     |     –       |    65     |
| Craters      |   4   |  2  |    2     |     4     |     85      |    75     |
| Crystalline  |   3   |  2  |    3     |     4     |     80      |    71     |
| Earthly      |   3   |  3  |    0     |     6     |     85      |    75     |
| Gaia         |   3   |  2  |    0     |     6     |     90      |    79     |
| Glacial      |   2   |  4  |    0     |     5     |     95      |    83     |
| Magma        |   3   |  5  |    0     |     5     |     80      |    71     |
| Metallic     |   4   |  2  |    2     |     4     |     85      |    75     |
| Oceanic      |   2   |  4  |    0     |     6     |     80      |    71     |
| Radioactive  |   3   |  4  |    0     |     4     |     90      |    79     |
| Rocky        |   4   |  2  |    0     |     5     |     85      |    75     |
| Toxic        |   3   |  5  |    0     |     4     |     90      |    79     |
| Tundra       |   3   |  3  |    0     |     5     |     95      |    83     |
| Volcanic     |   3   |  5  |    0     |     5     |     80      |    71     |

Notes:
- “Area Planet” is not applicable to Asteroids (shown as “–”).

---

## Base Astro Position Modifiers (Standard System)

Positions run from 1 (innermost orbit) to 8 (outermost). Values below are the baseline before applying any star-type modifiers.

| Metric        | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|---------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Solar Energy  |  5 |  4 |  3 |  2 |  1 |  0 |  0 |  0 |
| Fertility     | -1 |  0 | +1 | +1 | +2 | +2 | +3 | +3 |

- Star-type effects are applied additively to the above.

---

## Star Types and Their Effects

Star types alter the positional baseline and can add resource modifiers across orbits.

General rules:
- Modifiers are additive to base values unless otherwise noted.
- “All orbits” means positions 1–8 (or the set of orbits that exist in a given system).
- For even/odd position effects, apply exactly as specified (e.g., even positions: 2, 4, 6, 8).

### Red Giant
- Fertility:
  - Positions 1–3: −1
  - Positions 5–8: +1
- Solar Energy:
  - Positions 1–4: −1 (atmospheric stripping effects)
- Resources:
  - Gas: +2 (all orbits) due to intense stellar winds

### Super Giant
- Solar Energy:
  - Positions 1–4: +2 (overwhelming luminosity)
- Fertility:
  - Positions 1–4: −2 (extreme heat)
- Resources:
  - Crystals: +1 (all orbits) from exotic particle emissions

### Blue Star
- Solar Energy:
  - Positions 1–3: +2 (high UV harnessing potential)
- Fertility:
  - Positions 1–3: −2 (sterilizing UV)
- Resources:
  - Positions 4–6: +1 Metal, +1 Gas (youthful system dynamics)

### Neutron Star
- Fertility:
  - Positions 1–3: −3 (considered uninhabitable)
- Solar Energy:
  - Even positions (2,4,6,8): +2
  - Odd positions (1,3,5,7): −2 (pulsar beam sweep effects)
- Resources:
  - Positions 4–8: +3 Metal (dense debris accretion)

### White Star
- Solar Energy:
  - Positions 1–5: +1 (elevated heat distribution)
- Fertility:
  - Positions 2–4: +1 (shifted inward habitable zones)
- Resources:
  - Positions 3–6: +1 Gas (hydrogen winds)
  - All positions: −1 Crystals (spectral interference)

### White Dwarf Star
- Solar Energy:
  - All positions: −2 (diminished light output)
- Fertility:
  - Positions 5–8: +2 (cool, stable outer worlds)
- Resources:
  - Positions 1–4: +2 Metal (remnant capture)
  - All positions: −1 Gas (no active ejection)

### Orange Star
- Fertility:
  - Positions 3–6: +1 (prolonged stellar stability)
- Solar Energy:
  - No change (stable output; no flare-based bonuses)
- Resources:
  - Positions 1–3: +1 Gas (moderate winds)

### Yellow Star
- Solar Energy:
  - Positions 2–4: +1 (Sun-like balanced output)
- Fertility:
  - All positions: +1 (stable, permanent bonus)
- Resources:
  - Positions 6–8: −1 Gas (reduced reach in outer orbits)

---

## Star Types: Compact Summary

This table provides a quick reference of the primary additive modifiers per star type. Use the detailed sections above for full nuance and event/risk notes.

| Star Type      | Solar Energy Modifiers                        | Fertility Modifiers                 | Resource Modifiers                              | Notes/Risks                |
|----------------|-----------------------------------------------|-------------------------------------|-------------------------------------------------|----------------------------|
| Red Giant      | P1–4: −1                                      | P1–3: −1; P5–8: +1                  | Gas: +2 (all)                                   | —                          |
| Super Giant    | P1–4: +2                                      | P1–4: −2                            | Crystals: +1 (all)                              | —                          |
| Blue           | P1–3: +2                                      | P1–3: −2                            | P4–6: +1 Metal, +1 Gas                          | —                          |
| Neutron        | Even P: +2; Odd P: −2                         | P1–3: −3                            | P4–8: +3 Metal                                  | Pulsar emission pattern    |
| White          | P1–5: +1                                      | P2–4: +1                            | P3–6: +1 Gas; All: −1 Crystals                  | —                          |
| White Dwarf    | All: −2                                       | P5–8: +2                            | P1–4: +2 Metal; All: −1 Gas                     | —                          |
| Orange         | —                                             | P3–6: +1                            | P1–3: +1 Gas                                    | —                          |
| Yellow         | P2–4: +1                                      | All: +1                              | P6–8: −1 Gas                                    | —                          |

---

## Application Order and Computation Notes

1. Start with Base Astro Position (Solar Energy and Fertility) for the orbit (P1–P8).
2. Apply star-type positional modifiers (additive).
3. Apply star-type resource modifiers (Metal, Gas, Crystals) where applicable.
4. Combine with the terrain baseline (Metal, Gas, Crystals, Fertility) for the planet/asteroid.
5. Resulting planetary values = Terrain baseline + Star resource modifiers (if any) + Position-based Solar Energy/Fertility (after star modifiers).
6. No event-driven effects; all modifiers are permanent.
