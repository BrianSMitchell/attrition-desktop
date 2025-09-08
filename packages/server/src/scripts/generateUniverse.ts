import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import seedrandom from 'seedrandom';
import { Location } from '../models/Location';
import {
  formatCoord,
  randomInt,
  // Overhaul helpers
  pickStarKindFromCoord,
  getStarKindModifiers,
  pickTerrainFromCoord,
  computePlanetStats,
} from '@game/shared';
import { connectDatabase } from '../config/database';

// Load environment variables (explicit path to packages/server/.env)
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

// Configuration for universe generation
const UNIVERSE_CONFIG = {
  serverName: 'A', // Single character server identifier
  galaxyCount: 2,
  regionCount: 100, // 10x10 grid per galaxy
  maxSystemsPerRegion: 50,
  minSystemsPerRegion: 1,
  maxBodiesPerSystem: 20,
  minBodiesPerSystem: 1,
  seed: 'alpha-universe-2024' // Fixed seed for reproducibility
};

interface GenerationStats {
  totalLocations: number;
  planets: number;
  asteroids: number;
  galaxies: number;
  regions: number;
  systems: number;
}

/**
 * Generate universe data without database operations (for testing)
 */
export function generateUniverseData(): any[] {
  console.log('🌌 Generating universe data for testing...');
  
  // Initialize seeded random number generator
  const rng = seedrandom(UNIVERSE_CONFIG.seed);
  
  // Override Math.random with seeded version
  const originalRandom = Math.random;
  Math.random = rng;
  
  const locations: any[] = [];
  const stars: any[] = [];
  
  try {
    // Generate minimal test data - just a few locations
    for (let galaxyId = 0; galaxyId < 2; galaxyId++) {
      for (let regionId = 0; regionId < 2; regionId++) {
        // Generate exactly 2 systems per region for testing
        for (let systemId = 0; systemId < 2; systemId++) {
        // Generate exactly 2 bodies per system for testing (reserve body 0 for star)
        for (let bodyId = 1; bodyId <= 2; bodyId++) {
          const coord = formatCoord({
            server: UNIVERSE_CONFIG.serverName,
            galaxy: galaxyId,
            region: regionId,
            system: systemId * 10, // Spread out system positions
            body: bodyId
          });
          
          // Random body type (70% planets, 30% asteroids)
          const bodyType = Math.random() < 0.7 ? 'planet' : 'asteroid';
          
          // Generate properties based on type
          const fertility = bodyType === 'planet' 
            ? randomInt(1, 10) 
            : randomInt(1, 3); // Asteroids have lower fertility
          
          const baseResourceMultiplier = bodyType === 'planet' ? 1 : 0.6;
          
          const location = {
            coord,
            type: bodyType,
            properties: {
              fertility,
              resources: {
                metal: Math.floor(randomInt(0, 100) * baseResourceMultiplier),
                crystal: Math.floor(randomInt(0, 100) * baseResourceMultiplier),
                gas: Math.floor(randomInt(0, 100) * baseResourceMultiplier)
              }
            },
            owner: null
          };
          
          locations.push(location);
        }

        // Create central star at body 0 and append after bodies to keep tests stable
        const starCoord = formatCoord({
          server: UNIVERSE_CONFIG.serverName,
          galaxy: galaxyId,
          region: regionId,
          system: systemId * 10,
          body: 0
        });
        // Drop MK spectral starProperties in test generator; Overhaul-only stars will be attached in main generator.
        stars.push({
          coord: starCoord,
          type: 'star',
          owner: null
        });
        }
      }
    }
    
    return [...locations, ...stars];
    
  } finally {
    // Restore original Math.random
    Math.random = originalRandom;
  }
}

/**
 * Generate universe for the Alpha server
 */
export async function generateUniverse(): Promise<GenerationStats> {
  console.log('🌌 Starting universe generation for server:', UNIVERSE_CONFIG.serverName);
  
  // Initialize seeded random number generator
  const rng = seedrandom(UNIVERSE_CONFIG.seed);
  
  // Override Math.random with seeded version
  const originalRandom = Math.random;
  Math.random = rng;
  
  const stats: GenerationStats = {
    totalLocations: 0,
    planets: 0,
    asteroids: 0,
    galaxies: UNIVERSE_CONFIG.galaxyCount,
    regions: 0,
    systems: 0
  };
  
  const locations: any[] = [];
  
  try {
    // Check if universe already exists
    const existingCount = await Location.countDocuments({
      coord: { $regex: `^${UNIVERSE_CONFIG.serverName}` }
    });
    
    if (existingCount > 0) {
      console.log(`⚠️  Universe for server ${UNIVERSE_CONFIG.serverName} already exists (${existingCount} locations)`);
      console.log('Skipping generation. Delete existing locations first if you want to regenerate.');
      return stats;
    }
    
    console.log('📊 Generation parameters:');
    console.log(`  - Galaxies: ${UNIVERSE_CONFIG.galaxyCount}`);
    console.log(`  - Regions per galaxy: ${UNIVERSE_CONFIG.regionCount}`);
    console.log(`  - Systems per region: ${UNIVERSE_CONFIG.minSystemsPerRegion}-${UNIVERSE_CONFIG.maxSystemsPerRegion}`);
    console.log(`  - Bodies per system: ${UNIVERSE_CONFIG.minBodiesPerSystem}-${UNIVERSE_CONFIG.maxBodiesPerSystem}`);
    console.log(`  - Seed: ${UNIVERSE_CONFIG.seed}`);
    
    // Generate for each galaxy
    for (let galaxyId = 0; galaxyId < UNIVERSE_CONFIG.galaxyCount; galaxyId++) {
      console.log(`🌌 Generating galaxy ${galaxyId}...`);
      
      // Generate for each region in the galaxy
      for (let regionId = 0; regionId < UNIVERSE_CONFIG.regionCount; regionId++) {
        stats.regions++;
        
        // Random number of star systems in this region
        const systemCount = randomInt(
          UNIVERSE_CONFIG.minSystemsPerRegion,
          UNIVERSE_CONFIG.maxSystemsPerRegion
        );
        
        // Track used positions in this region (0-99)
        const usedPositions = new Set<number>();
        
        // Generate star systems
        for (let i = 0; i < systemCount; i++) {
          // Find unique position for this system
          let systemPosition: number;
          do {
            systemPosition = randomInt(0, 99);
          } while (usedPositions.has(systemPosition));
          
          usedPositions.add(systemPosition);
          stats.systems++;

          // Create central star at body 0 for this system
          const starCoord = formatCoord({
            server: UNIVERSE_CONFIG.serverName,
            galaxy: galaxyId,
            region: regionId,
            system: systemPosition,
            body: 0
          });
          // Overhaul-only star definition (no MK spectral properties)
          const starKind = pickStarKindFromCoord(starCoord, 101);
          const orbitModifiers = Array.from({ length: 8 }, (_, i) => {
            const pos = i + 1;
            const mods = getStarKindModifiers(starKind, pos);
            return {
              position: pos,
              solarEnergyDelta: mods.solarEnergyDelta,
              fertilityDelta: mods.fertilityDelta,
              resourceDelta: {
                metal: mods.resourceDelta?.metal ?? 0,
                gas: mods.resourceDelta?.gas ?? 0,
                crystals: mods.resourceDelta?.crystals ?? 0,
              },
            };
          });

          locations.push({
            coord: starCoord,
            type: 'star',
            // Universe Overhaul: star-level data (authoritative)
            starOverhaul: {
              kind: starKind as any,
              orbitModifiers,
              notes: undefined,
            },
            owner: null,
          });
          stats.totalLocations++;
          
          // Random number of celestial bodies in this system
          const bodyCount = randomInt(
            UNIVERSE_CONFIG.minBodiesPerSystem,
            UNIVERSE_CONFIG.maxBodiesPerSystem
          );
          const maxBodiesForPlanets = Math.min(bodyCount, 19);
          
          // Generate celestial bodies (reserve body 0 for star)
          for (let bodyId = 1; bodyId <= maxBodiesForPlanets; bodyId++) {
            const coord = formatCoord({
              server: UNIVERSE_CONFIG.serverName,
              galaxy: galaxyId,
              region: regionId,
              system: systemPosition,
              body: bodyId
            });
            
            // Random body type (70% planets, 30% asteroids)
            const bodyType = Math.random() < 0.7 ? 'planet' : 'asteroid';
            
            // Generate properties based on type
            const fertility = bodyType === 'planet' 
              ? randomInt(1, 10) 
              : randomInt(1, 3); // Asteroids have lower fertility
            
            const baseResourceMultiplier = bodyType === 'planet' ? 1 : 0.6;
            
            // Universe Overhaul computation for bodies
            const SCALE = 100; // legacy resource scaling factor
            const orbitPosition = Math.min(bodyId, 8);
            const isAsteroid = bodyType !== 'planet';
            const terrainType = pickTerrainFromCoord(coord, bodyId, isAsteroid);

            const comp = computePlanetStats({
              kind: starKind as any,
              terrain: terrainType as any,
              position: orbitPosition,
            });

            const fertLegacy = Math.max(1, Math.min(10, Math.round(comp.result.fertility)));
            const metalLegacy = Math.floor(comp.result.yields.metal * SCALE);
            const energyLegacy = Math.floor(comp.result.yields.gas * SCALE);
            const researchLegacy = Math.floor(comp.result.yields.crystals * SCALE);

            const location = {
              coord,
              type: bodyType,
              // legacy properties for compatibility
              properties: {
                fertility: fertLegacy,
                resources: {
                  metal: metalLegacy,
                  energy: energyLegacy,
                  research: researchLegacy,
                },
              },
              // overhaul fields
              orbitPosition,
              terrain: {
                type: terrainType,
                baseline: comp.baselineTerrain,
              },
              positionBase: comp.basePosition,
              starApplied: {
                solarEnergyDelta: comp.starMods.solarEnergyDelta,
                fertilityDelta: comp.starMods.fertilityDelta,
                resourceDelta: {
                  metal: comp.starMods.resourceDelta?.metal ?? 0,
                  gas: comp.starMods.resourceDelta?.gas ?? 0,
                  crystals: comp.starMods.resourceDelta?.crystals ?? 0,
                },
              },
              result: comp.result,
              owner: null,
            };
            
            locations.push(location);
            stats.totalLocations++;
            
            if (bodyType === 'planet') {
              stats.planets++;
            } else {
              stats.asteroids++;
            }
          }
        }
      }
      
      // Progress update every 10 galaxies
      if ((galaxyId + 1) % 10 === 0) {
        console.log(`  ✅ Completed ${galaxyId + 1}/${UNIVERSE_CONFIG.galaxyCount} galaxies`);
      }
    }
    
    console.log('💾 Saving locations to database...');
    console.log(`  - Total locations to save: ${locations.length}`);
    
    // Batch insert for better performance
    const batchSize = 1000;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      await Location.insertMany(batch);
      
      const progress = Math.round(((i + batch.length) / locations.length) * 100);
      console.log(`  📊 Progress: ${progress}% (${i + batch.length}/${locations.length})`);
    }
    
    console.log('✅ Universe generation completed successfully!');
    console.log('📈 Final statistics:');
    console.log(`  - Total locations: ${stats.totalLocations.toLocaleString()}`);
    console.log(`  - Planets: ${stats.planets.toLocaleString()}`);
    console.log(`  - Asteroids: ${stats.asteroids.toLocaleString()}`);
    console.log(`  - Galaxies: ${stats.galaxies}`);
    console.log(`  - Regions: ${stats.regions.toLocaleString()}`);
    console.log(`  - Star systems: ${stats.systems.toLocaleString()}`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error during universe generation:', error);
    throw error;
  } finally {
    // Restore original Math.random
    Math.random = originalRandom;
  }
}

/**
 * CLI script runner
 */
async function runScript() {
  try {
    console.log('🚀 Universe Generation Script');
    console.log('==============================');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Generate universe
    const stats = await generateUniverse();
    
    if (stats.totalLocations > 0) {
      console.log('\n🎉 Universe generation completed successfully!');
      console.log('You can now start the server and explore the universe.');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run script if called directly
if (require.main === module) {
  runScript();
}
