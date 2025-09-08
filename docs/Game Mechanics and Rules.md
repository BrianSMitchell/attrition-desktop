# Game Mechanics and Rules (Attrition)

## 1. Overview

Attrition is a persistent space strategy game where you build bases, manage resources, research technologies, trade, command fleets, and coordinate with a guild to expand your empire.

### What This Document Covers
This document consolidates all game mechanics, rules, and specifications from the canonical source code and in-game help systems. It serves as the single source of truth for game behavior and calculations.

## 2. Universe, Map, and Coordinates

### Galaxies, Regions, Systems, and Astros
- **Galaxies**: The largest division, containing multiple regions
- **Regions**: 100x100 grid of star systems within each galaxy
- **Systems**: Individual star systems containing planets and asteroids
- **Astros**: Planets and asteroids orbiting stars (positions 1-8)

### Wormholes
- **Placement**: Connect distant galaxies for faster travel
- **Usage**: Allow fleet movement between connected galaxies
- **Speed Factor**: 70% faster travel time through wormholes
- **Restrictions**: Death Stars cannot use wormholes

### Coordinates Format
Coordinates use the format: `A00:51:09:01`
- **Server**: A00 (server identifier)
- **Galaxy**: 51 (galaxy number)
- **Region**: 09 (region within galaxy, 00-99)
- **System**: 01 (system within region, 00-99)

## 3. Planetary Generation and Environment

### Orbit Position Effects (Base)
| Position | Solar Energy | Fertility | Gas |
|----------|-------------|-----------|-----|
| P1       | 5          | -1       | 0   |
| P2       | 4          | 0        | 0   |
| P3       | 3          | 1        | 0   |
| P4       | 2          | 1        | 1   |
| P5       | 1          | 2        | 2   |
| P6       | 0          | 2        | 3   |
| P7       | 0          | 3        | 4   |
| P8       | 0          | 3        | 5   |

### Star Kind Modifiers by Orbit Position

#### Yellow Stars
- **Solar Energy**: P2–P4: +1
- **Fertility**: All positions: +1
- **Resources**: P6–P8: -1 Gas

#### Orange Stars
- **Fertility**: P3–P6: +1
- **Resources**: P1–P3: +1 Gas

#### White Stars
- **Solar Energy**: P1–P5: +1
- **Fertility**: P2–P4: +1
- **Resources**: P3–P6: +1 Gas; All positions: -1 Crystals

#### Blue Stars
- **Solar Energy**: P1–P3: +2
- **Fertility**: P1–P3: -2
- **Resources**: P4–P6: +1 Metal, +1 Gas

#### Red Giant Stars
- **Solar Energy**: P1–P4: -1
- **Fertility**: P1–P3: -1; P5–P8: +1
- **Resources**: All positions: +2 Gas

#### Super Giant Stars
- **Solar Energy**: P1–P4: +2
- **Fertility**: P1–P4: -2
- **Resources**: All positions: +1 Crystals

#### White Dwarf Stars
- **Solar Energy**: All positions: -2
- **Fertility**: P5–P8: +2
- **Resources**: P1–P4: +2 Metal; All positions: -1 Gas

#### Neutron Stars
- **Solar Energy**: Even positions: +2; Odd positions: -2
- **Fertility**: P1–P3: -3
- **Resources**: P4–P8: +3 Metal

### Terrains and Baseline Yields

| Terrain     | Metal | Gas | Crystals | Fertility | Area (Planet) |
|-------------|-------|-----|----------|-----------|---------------|
| Arid        | 3     | 3   | 0        | 5         | 95            |
| Asteroid    | 4     | 2   | 2        | 4         | 65            |
| Craters     | 4     | 2   | 2        | 4         | 85            |
| Crystalline | 3     | 2   | 3        | 4         | 80            |
| Earthly     | 3     | 3   | 0        | 6         | 85            |
| Gaia        | 3     | 2   | 0        | 6         | 90            |
| Glacial     | 2     | 4   | 0        | 5         | 95            |
| Magma       | 3     | 5   | 0        | 5         | 80            |
| Metallic    | 4     | 2   | 2        | 4         | 85            |
| Oceanic     | 2     | 4   | 0        | 6         | 80            |
| Radioactive | 3     | 4   | 0        | 4         | 90            |
| Rocky       | 4     | 2   | 0        | 5         | 85            |
| Toxic       | 3     | 5   | 0        | 4         | 90            |
| Tundra      | 3     | 3   | 0        | 5         | 95            |
| Volcanic    | 3     | 5   | 0        | 5         | 80            |

### Final Planet Stat Composition
Final planet values are calculated as:
- **Solar Energy**: Terrain baseline + Star resource deltas + Base Orbit + Star Solar/Fertility deltas
- **Fertility**: Terrain baseline + Base Orbit fertility + Star fertility deltas
- **Yields**: Terrain baselines + Star resource deltas (clamped to ≥ 0)
- **Area**: Planet area from terrain baseline

## 4. Resources, Economy, and Credits

### Credits Concept
Credits are the universal currency used for construction, research, and unit production. The economy system generates credits per hour based on structures and planetary conditions.

### Trade Routes
- **Formula**: Trade Income = Sqrt(Lowest base's income) x [ 1 + Sqrt(2*Distance)/75 + Sqrt(Players)/10 ]
- **Distance Factor**: Based on galaxy distance between trading partners
- **Costs**: The setting cost of a trade route is equal to 2 times the distance between the two bases. For example, a trade route from a base located in A00:49:10 to a base located in A00:59:10 will cost 20 credits, since they are 10 lightyears apart.
- **Partners**: Limited number of simultaneous trade routes
- **Closing**: Routes can be closed with penalties

### Debris and Recyclers
- **Debris Generation**: Created from destroyed units and structures
- **Recycler Units**: Specialized ships that collect debris
- **Conversion**: Debris converted back to credits
- **Collection Range**: Limited by recycler unit capabilities

### Pillage Formula
- **Player Pillage**: Pillage = (number of hours since last pillage; max 100)% * (Base Economy/Total Bases Economy) * Base Owner Credits
- **NPC Pillage**: Pillage = number of hours since last pillage (max 100)% * Base Economy * 16
- **Additional Bonus**: Additional Pillage bonus: (base actual income - new income)^2 * 5
- **Cadence**: Regular intervals for pillage collection
No base can be pillaged more than once every 24 hours, however. Additional attacks launched during this time will result in the base being occupied, but will not give additional credits from pillaging.

An occupied base has 30% less construction, production and research capacity. This makes any tasks performed at the base take longer.

If ships are destroyed during an attack, 20% of the cost of the units destroyed will be given to each player as combat loot, and 40% will be converted into debris which will remain at the location of the attack. A player can collect those debris by sending recyclers to that astro, recyclers will work automatically, converting debris into credits every hour.

The combat loot can be collected in the game credits page. Uncollected loot is automatically credited to the player's account after 24 hours.



### Level Formulas
- **Guild Level**: Guild Level = (Guild Economy x 100 + Guild Fleet + Avg. Guild Technology) ^ 0.25
- **Player Level**: Player Level = (Economy x 100 + fleet + technology) ^ 0.25

## 5. Bases and Structures

### Base Management
- **Ownership**: Bases can be established on planets
- **Construction**: Buildings require credits, energy, and population
- **Production**: Units and goods produced at shipyards
- **Research**: Technologies developed at research labs
- **Queues**: Separate queues for construction, production, and research

### Structure Effects and Requirements

| Structure | Credits | Energy | Economy | Population | Area | Advanced | Requires |
|-----------|---------|--------|---------|------------|------|----------|----------|
| Urban Structures | 1 | 0 | 0 | 0 | -1 |  |  |
| Solar Plants | 1 | +1 | 0 | -1 | -1 |  |  |
| Gas Plants | 1 | +1 | 0 | -1 | -1 |  |  |
| Fusion Plants | 20 | +4 | 0 | -1 | -1 |  | Energy 6 |
| Antimatter Plants | 2000 | +10 | 0 | -1 | -1 | x | Energy 20 |
| Orbital Plants | 40000 | +12 | 0 | -1 | 0 | x | Energy 25 |
| Research Labs | 2 | -1 | 0 | -1 | -1 |  |  |
| Metal Refineries | 1 | -1 | +1 | -1 | -1 |  |  |
| Crystal Mines | 2 | -1 | 0 | -1 | -1 |  |  |
| Robotic Factories | 5 | -1 | +1 | -1 | -1 |  | Computer 2 |
| Command Centers | 20 | -1 | 0 | -1 | -1 |  | Computer 6 |
| Shipyards | 5 | -1 | +1 | -1 | -1 |  |  |
| Orbital Shipyards | 10000 | -12 | +2 | -1 | 0 |  | Cybernetics 2 |
| Spaceports | 5 | -1 | +2 | -1 | -1 |  |  |
| Nanite Factories | 80 | -2 | +2 | -1 | -1 |  | Computer 10, Laser 8 |
| Android Factories | 1000 | -4 | +2 | -1 | -1 |  | AI 4 |
| Economic Centers | 80 | -2 | +3 | -1 | -1 |  | Computer 10 |
| Terraform | 80 | 0 | 0 | 0 | -1 |  | Computer 10, Energy 10 |
| Multi-Level Platforms | 10000 | 0 | 0 | 0 | -10 | x | Armour 22 |
| Orbital Base | 2000 | 0 | 0 | 0 | 0 | x | Computer 20 |
| Jump Gate | 5000 | -12 | 0 | -1 | 0 | x | Warp Drive 12, Energy 20 |
| Biosphere Modification | 20000 | -24 | 0 | -1 | 0 | x | Computer 24, Energy 24 |
| Capital | 15000 | -12 | +10 | -1 | 0 | x | Tachyon Communications 1 |

### Structure Effects
- **Urban Structures**: Increases population capacity by base fertility
- **Solar/Gas Plants**: Increases base energy output by base solar/gas resource
- **Fusion/Antimatter/Orbital Plants**: Increases base energy output by fixed amounts
- **Research Labs**: Increases base research by 8, allows new technologies
- **Metal Refineries**: Increases production and construction by base metal resource
- **Crystal Mines**: Increases economy by base crystals resource
- **Robotic Factories**: Increases production and construction by 2
- **Shipyards**: Increases production by 2 and allows new units
- **Orbital Shipyards**: Increases production by 8 and allows new units
- **Spaceports**: Increases economy by 2 and allows trade routes
- **Command Centers**: Adds 5% fleet attack power at base and allows 1 occupation
- **Nanite Factories**: Increases production and construction by 4
- **Android Factories**: Increases production and construction by 6
- **Economic Centers**: Increases economy by 3
- **Terraform**: Increases base area by 5
- **Multi-Level Platforms**: Increases base area by 10
- **Orbital Base**: Increases population capacity by 10
- **Jump Gate**: Increases fleet speed by 70% and allows travel between galaxies
- **Biosphere Modification**: Increases planet fertility by 1
- **Capital**: Increases economy by 10 and other bases by 1. -15% empire income while occupied

### Occupation Effects
- **Income Reduction**: 30% of base income goes to occupying empire
- **Queue Penalties**: Construction, production, and research queues are slowed
- **Unrest**: Occupied bases can experience unrest and revolts
- **Jump Gates**: Disabled when occupation exceeds certain thresholds
- **Defense Auto-Repair**: Base defenses automatically repair over time

## 6. Capacities (Construction, Production, Research)

### Definitions
- **Construction Capacity**: Determines how quickly structures and defenses are built (credits per hour)
- **Production Capacity**: Determines how quickly ships and goods are produced (credits per hour)
- **Research Capacity**: Determines how quickly technologies can be researched (credits per hour)

### Baselines
- **Construction**: 40 cred/h (even with no capacity buildings)
- **Production**: 0 cred/h (requires structures/tech to increase)
- **Research**: 0 cred/h (requires research labs)

### Flat Contributions
- **Construction**:
  - Metal Refineries: + base metal resource value per level
  - Robotic Factories: +5 per level
  - Nanite Factories: +10 per level
  - Android Factories: +18 per level
- **Production**:
  - Shipyards: +2 per level
  - Orbital Shipyards: +8 per level
  - Metal Refineries: + base metal resource value per level
  - Robotic Factories: +2 per level
  - Nanite Factories: +4 per level
  - Android Factories: +6 per level
- **Research**:
  - Research Labs: +8 per level

### Percent Multipliers
- **Cybernetics Technology**: +5% to construction and production capacities
- **Artificial Intelligence Technology**: +5% to research capacity
- **Environment - Solar Energy**: +1% per base solar energy unit (construction)
- **Environment - Metal Yield**: +1% per metal yield unit (production)
- **Environment - Fertility**: +1% per fertility unit (research)
- **Commander Bonuses**: Percent bonuses from assigned commanders

### Time Formulas
- **Construction Time (hours)** = Structure Cost (credits) / Construction Capacity (cred/h)
- **Production Time (hours)** = Unit Cost (credits) / Production Capacity (cred/h)
- **Research Time (hours)** = Technology Cost (credits) / Research Capacity (cred/h)

### Worked Examples
- **Construction**: Structure cost 100 credits, capacity 20 cred/h → 5 hours
- **Production**: Unit cost 50 credits, capacity 10 cred/h → 5 hours
- **Research**: Technology cost 80 credits, capacity 40 cred/h → 2 hours

**Note**: Percent bonuses apply after summing flat additions. Commander reductions apply to final time.

## 7. Technologies

| Technology | Credits | Labs | Requires | Description |
|------------|---------|------|----------|-------------|
| Energy | 2 | 1 |  | Increases all bases energy output by 5% |
| Computer | 2 | 1 |  | Allows one campaign fleet per level |
| Armour | 4 | 2 |  | Increases units and defenses armour by 5% |
| Laser | 4 | 2 | Energy 2 | Increases laser weapons power by 5% |
| Missiles | 8 | 4 | Computer 4 | Increases missile weapons power by 5% |
| Stellar Drive | 16 | 5 | Energy 6 | Increases stellar units speed by 5% |
| Plasma | 32 | 6 | Energy 6, Laser 4 | Increases plasma weapons power by 5% |
| Warp Drive | 64 | 8 | Energy 8, Stellar Drive 4 | Increases warp units speed by 5% |
| Shielding | 128 | 10 | Energy 10 | Increases units and defenses shield by 5% |
| Ion | 256 | 12 | Energy 12, Laser 10 | Increases ion weapons power by 5% |
| Stealth | 512 | 14 | Energy 14 | Decreases the time your own fleets can be detected |
| Photon | 1024 | 16 | Energy 16, Plasma 8 | Increases photon weapons power by 5% |
| AI | 2048 | 18 | Computer 20 | Increases all bases research output by 5% |
| Disruptor | 4096 | 20 | Energy 20, Laser 18 | Increases disruptor weapons power by 5% |
| Cybernetics | 8192 | 22 | AI 6 | Increases all bases construction and production by 5% |
| Tachyon Communications | 32768 | 24 | Energy 24, Computer 24 | Allows 1 research link between 2 bases (min labs 20) |
| Anti-Gravity | 100000 | 26 | Energy 26, Computer 26 | Decreases orbital structures construction time by 5% and increases Death Star speed by 5% |

**Notes**: Phase A focuses on level 1 unlocks with credits and lab gating. Research labs are required at the base for technology research.

## 8. Units and Fleets

| Unit | Credits | Drive | Weapon | Attack | Armour | Shield | Hangar | Speed | Shipyard | Requires |
|------|---------|-------|--------|--------|--------|--------|--------|-------|----------|----------|
| Fighter | 5 | Inter | Laser | 2 | 2 | 0 | -1 | 0 | 1 | Laser 1 |
| Bomber | 10 | Inter | Missiles | 4 | 2 | 0 | -1 | 0 | 2 | Missiles 1 |
| Heavy Bomber | 30 | Inter | Plasma | 10 | 4 | 0 | -2 | 0 | 3 | Plasma 14 |
| Ion Bomber | 60 | Inter | Ion | 12 | 4 | 1 | -2 | 3 |  | Ion 10, Shielding 10 |
| Corvette | 20 | Stellar | Laser | 4 | 4 | 0 | 0 | 10 | 4 | Laser 2, Stellar Drive 1, Armour 2 |
| Recycler | 30 | Stellar* | Laser | 2 | 2 | 0 | 0 | 8 | 5 | Laser 1, Stellar Drive 1, Armour 2 |
| Destroyer | 40 | Stellar | Plasma | 8 | 8 | 0 | 0 | 8 | 6 | Plasma 1, Stellar Drive 2, Armour 6 |
| Frigate | 80 | Stellar | Missiles | 12 | 12 | 0 | 4 | 6 | 8 | Missiles 6, Stellar Drive 4, Armour 8 |
| Ion Frigate | 120 | Stellar | Ion | 14 | 12 | 1 | 4 | 6 | 8 | Ion 10, Stellar Drive 4, Armour 8, Shielding 10 |
| Scout Ship | 40 | Warp | Laser | 1 | 2 | 0 | 0 | 12 | 4 | Warp Drive 1 |
| Outpost Ship | 100 | Warp | Laser | 2 | 4 | 0 | 0 | 4 | 8 | Warp Drive 1 |
| Cruiser | 200 | Warp | Plasma | 24 | 24 | 2 | 4 | 5 | 10 | Plasma 4, Warp Drive 2, Armour 10, Shielding 2 |
| Carrier | 400 | Warp | Missiles | 12 | 24 | 2 | 80 | 5 | 12 | Missiles 6, Warp Drive 4, Armour 10, Shielding 2 |
| Heavy Cruiser | 500 | Warp | Plasma | 48 | 48 | 4 | 8 | 4 | 12 | Plasma 6, Warp Drive 4, Armour 12, Shielding 4 |
| Battleship | 2000 | Warp | Ion | 168 | 128 | 10 | 40 | 4 | 16 | Ion 6, Warp Drive 8, Armour 16, Shielding 8 |
| Fleet Carrier | 2500 | Warp | Ion | 64 | 96 | 8 | 500 | 4 | 16 | Ion 4, Warp Drive 8, Armour 14, Shielding 6 |
| Dreadnought | 10000 | Warp | Photon | 756 | 512 | 20 | 200 | 3 | 20, 1 | Photon 6, Warp Drive 12, Armour 20, Shielding 10 |
| Titan | 50000 | Warp | Disruptor | 3500 | 2048 | 30 | 1000 | 3 | 22, 3 | Disruptor 6, Warp Drive 14, Armour 22, Shielding 14 |
| Leviathan | 200000 | Warp | Photon | 10000 | 6600 | 40 | 4000 | 2 | 24, 5 | Photon 12, Warp Drive 18, Armour 24, Shielding 16 |
| Death Star | 500000 | Warp | Disruptor | 26500 | 14000 | 60 | 10000 | 2 | 26, 7 | Disruptor 10, Warp Drive 20, Armour 26, Shielding 18 |

### Unit Descriptions
- **Fighter**: Good fighting unit against unshielded units
- **Bomber**: Good fighting unit against unshielded and low shield units
- **Heavy Bomber**: Good fighting unit against medium shielded units
- **Ion Bomber**: Good against high shielded units, 50% power cross shields
- **Corvette**: Very fast unit, good against unshielded units
- **Recycler**: Can collect debris and convert them into credits
- **Destroyer**: Fast unit, good against low shielded units
- **Frigate**: Versatile unit, has 4 hangar space
- **Ion Frigate**: Versatile unit, 50% power cross shields
- **Scout Ship**: Faster ship, good for scouting
- **Outpost Ship**: Warp unit that can build a new base
- **Cruiser**: Versatile unit, good for long range action and escort
- **Carrier**: Unit with 80 hangar spaces
- **Heavy Cruiser**: Strong unit, good against large units
- **Battleship**: Strong unit, good against large units
- **Fleet Carrier**: Large carrier with 500 hangar spaces
- **Dreadnought**: Very strong combat unit
- **Titan**: Very large and strong combat unit
- **Leviathan**: Huge combat unit, gives +5% power and armour to fleet
- **Death Star**: Biggest unit, can't use jump gates, gives +10% power and armour to fleet

### Fleet Mechanics
- **Movement**: Fleets travel between systems with speed-based timing
- **Carriers/Hangar**: Large ships can carry smaller units in hangars
- **Jump Gates**: Provide 70% speed bonus but Death Stars cannot use them
- **Detection**: Enemy fleets can be detected before arrival
- **Fleet Limit**: Maximum Supported Fleet Size = Total Production × 2500

## 9. Defenses

| Defense | Credits | Weapon | Attack | Armour | Shield | Energy | Area | Requires |
|---------|---------|--------|--------|--------|--------|--------|------|----------|
| Barracks | 5 | Laser | 4 | 4 | 0 | -1 | -1 |  |
| Laser Turrets | 10 | Laser | 8 | 8 | 0 | -1 | -1 | Laser 1 |
| Missile Turrets | 20 | Missiles | 16 | 16 | 0 | -1 | -1 | Missiles 1 |
| Plasma Turrets | 100 | Plasma | 24 | 24 | 0 | -2 | -1 | Plasma 1, Armour 6 |
| Ion Turrets | 250 | Ion | 40 | 40 | 2 | -3 | -1 | Ion 1, Armour 10, Shielding 2 |
| Photon Turrets | 1000 | Photon | 80 | 80 | 6 | -4 | -1 | Photon 1, Armour 14, Shielding 6 |
| Disruptor Turrets | 4000 | Disruptor | 320 | 320 | 8 | -8 | -1 | Disruptor 1, Armour 18, Shielding 8 |
| Deflection Shields | 4000 | Ion | 2 | 640 | 16 | -8 | -1 | Ion 6, Shielding 10 |
| Planetary Shield | 25000 | Ion | 4 | 2000 | 20 | -16 | -1 | Ion 10, Shielding 14 |
| Planetary Ring | 50000 | Photon | 1600 | 1000 | 12 | -24 | -1 | Photon 10, Armour 22, Shielding 12 |

### Defense Descriptions
- **Barracks**: Help protect your bases, the cheapest defense
- **Laser Turrets**: Small defenses, good against small units
- **Missile Turrets**: Small defenses, good against small and medium units
- **Plasma Turrets**: Average defenses, good against medium units
- **Ion Turrets**: Average defenses, good against medium units
- **Photon Turrets**: Big defenses, good against large units
- **Disruptor Turrets**: Biggest turrets, good against large units
- **Deflection Shields**: Strong shields that increase bases protection
- **Planetary Shield**: Planetary shields that increases bases protection
- **Planetary Ring**: Planetary defensive ring

**Note**: Each level of defenses requires 1 Population.

## 10. Combat

### Combat Stats
- **Attack**: Damage dealt to enemy units
- **Armour**: Damage reduction from physical attacks
- **Shield**: Damage reduction from energy attacks
- **Cross-Shield Damage**: Ion weapons deal 50% damage through shields

### Special Rules
- **Fighter Targeting**: Fighters can only target units up to 2× their size
- **Base Defense Auto-Repair**: Base defenses repair automatically over time
- **Ship Repair**: Cruiser and larger ships can be partially repaired after combat

## 11. Attacks, Occupation, and Unrest

### Attack Effects
- **Income Tribute**: 30% of occupied base income goes to attacker
- **Queue Penalties**: Occupied bases have slowed construction/production/research
- **Unrest Thresholds**: High occupation levels cause unrest
- **Recovery**: Unrest decreases over time if occupation is reduced
- **Revolt**: Severe unrest can lead to base revolts
- **Jump Gate Disable**: Jump gates stop functioning at high occupation levels

## 12. Newbie Protection

### Protection Rules
- **Level-Based Protection**: New players receive protection based on level
- **Exceptions**: Protection can be lost through aggressive actions
- **Reduced Gains**: Attacking low-level players gives reduced rewards
- **Duration**: Protection lasts for a limited time or until certain conditions

## 13. Commanders

### Commander System
- **Recruitment**: Commanders can be recruited with proper technology
- **Limits**: Computer technology determines maximum commanders
- **Assignment**: Commanders can be assigned to bases or fleets
- **Travel Time**: Commanders take time to travel between locations
- **Death Risk**: Commanders can die in combat with certain probabilities
- **Bonuses**: Commanders provide various bonuses to assigned units

## 14. Vacation Mode

### Vacation Rules
- **Activation**: Players can activate vacation mode for extended absences
- **Time Windows**: Vacation mode has minimum and maximum durations
- **Restrictions**: Limited actions available while in vacation mode
- **Protection**: Vacation mode provides additional protection from attacks

## 15. Miscellaneous Systems

### Communication and Organization
- **Messages**: In-game messaging system for player communication
- **Notes**: Personal notes system for organization
- **Bookmarks**: System for marking important locations
- **Recruiting**: System for recruiting new players
- **Forum**: Community discussion areas

### NPC Systems
- **NPC Base Stability**: U.C. (Universal Credits) system for NPC bases
- **Server Time**: All game events use server time for consistency
- **Inactivity Rules**: Income reduction and stability degradation for inactive players

### Shared IPs Policy
- **Detection**: System detects multiple accounts from same IP
- **Requirements**: Upgraded accounts required for shared IP usage
- **Cross-Server**: Shared IPs allowed across different game servers
- **Penalties**: Free accounts suspended for shared IP violations

## 16. Starting Guide

### New Player Progression
1. **Account Creation**: Register and verify account
2. **First Base**: Establish initial base on suitable planet
3. **Resource Gathering**: Build basic resource production
4. **Technology Research**: Unlock fundamental technologies
5. **Expansion**: Establish additional bases and colonies
6. **Fleet Building**: Construct and command military units
7. **Trade Networks**: Establish economic relationships
8. **Guild Membership**: Join or form alliances

### Occupied Base Guide
1. **Assessment**: Evaluate occupation level and unrest
2. **Resource Management**: Balance tribute and local production
3. **Defense Maintenance**: Repair and upgrade base defenses
4. **Queue Management**: Prioritize critical construction/research
5. **Unrest Control**: Reduce occupation to manage unrest
6. **Economic Recovery**: Restore base productivity over time

## 17. Dictionary

### Common Terms and Abbreviations
- **AE**: Astro Empires (game name)
- **Cred**: Credits (game currency)
- **U.C.**: Universal Credits (NPC currency)
- **Pillage**: Income gained from defeated enemies
- **Debris**: Resources left from destroyed units
- **Hangar**: Space for carrying small units on carriers
- **Cross-Shield**: Damage that penetrates enemy shields
- **Queue**: Construction, production, or research waiting list
- **Tribute**: Income taken from occupied bases
- **Unrest**: Population dissatisfaction in occupied bases

## 18. Formulas Reference

### Trade Income
```
Income = (Partner Economy × Distance Factor) / 10
```

### Pillage (Players)
```
Pillage Amount = Percentage of Defeated Empire's Income
```

### Pillage (NPC)
```
Fixed amounts based on NPC base level
```

### Additional Pillage Bonus
```
Bonus = Base Pillage × Success Multiplier
```

### Detection Time
```
Detection Hours = Fleet Speed × Distance × Detection Modifier
```

### Experience (vs Higher Level)
```
XP = Base XP × (1 - Level Difference Penalty)
```

### Experience (vs Lower Level)
```
XP = Base XP × (1 - Level Advantage Reduction)
```

### Fleet Limit
```
Maximum Supported Fleet Size = Total Production × 2500
```

### Construction Time
```
Time (hours) = Structure Cost (credits) / Construction Capacity (cred/h)
```

### Production Time
```
Time (hours) = Unit Cost (credits) / Production Capacity (cred/h)
```

### Research Time
```
Time (hours) = Technology Cost (credits) / Research Capacity (cred/h)
```

### Empire Level
```
Level = f(Total Economic Output, Technological Advancement)
```

### Guild Level
```
Level = Aggregate of Member Empire Levels
```

### Player Level
```
Level = f(Individual Achievement, Contribution Metrics)
```

## 19. Notes on Version/Phase

### Phase A Implementation Notes
- **Technology Gating**: Currently focused on level 1 unlocks with credits and lab requirements
- **Credits-Only Economy**: Primary resource system with capacity-driven time calculations
- **Building Mappings**: Structures map to existing server types for Phase A compatibility
- **Future Expansions**: Areas marked for enhancement in subsequent phases

### Canonical Source Files
This document is generated from:
- `packages/shared/src/tech.ts` - Technology specifications
- `packages/shared/src/buildings.ts` - Structure specifications
- `packages/shared/src/defenses.ts` - Defense specifications
- `packages/shared/src/units.ts` - Unit specifications
- `packages/shared/src/capacities.ts` - Capacity calculations
- `packages/shared/src/overhaul.ts` - Planetary generation and environment
- `packages/client/src/components/help/helpData.tsx` - In-game help content
- `packages/client/src/components/help/faqData.tsx` - FAQ content
- `packages/client/src/components/game/GameInfoModal.tsx` - Game info tables

For the latest updates, refer to these source files in the repository.
