import 'dotenv/config';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import seedrandom from 'seedrandom';
import { supabase } from '../config/supabase';
// Removed legacy database type check - we're fully on Supabase now
import {
  formatCoord,
  randomInt,
  pickStarKindFromCoord,
  getStarKindModifiers,
  pickTerrainFromCoord,
  computePlanetStats,
} from '@game/shared';

// Ensure we load env from packages/server/.env when run directly
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const UNIVERSE_CONFIG = {
  serverName: 'A',
  galaxyCount: 2,
  regionCount: 100,
  maxSystemsPerRegion: 50,
  minSystemsPerRegion: 1,
  maxBodiesPerSystem: 20,
  minBodiesPerSystem: 1,
  seed: 'alpha-universe-2024',
};

async function universeExistsForServer(server: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .like('coord', `${server}%`);
  if (error) {
    throw new Error(`Failed to check existing universe: ${error.message}`);
  }
  return (count ?? 0) > 0;
}

export async function generateUniverseSupabase() {
  // We're fully migrated to Supabase, no need to check database type

  console.log('🌌 Starting Supabase universe generation for server:', UNIVERSE_CONFIG.serverName);

  if (await universeExistsForServer(UNIVERSE_CONFIG.serverName)) {
    console.log(`⚠️  Universe for server ${UNIVERSE_CONFIG.serverName} already exists in Supabase.`);
    console.log('    Skipping generation. Delete existing rows from public.locations to regenerate.');
    return;
  }

  const rng = seedrandom(UNIVERSE_CONFIG.seed);
  const originalRandom = Math.random;
  Math.random = rng;

  try {
    const rows: any[] = [];

    console.log('📊 Generation parameters:');
    console.log(`  - Galaxies: ${UNIVERSE_CONFIG.galaxyCount}`);
    console.log(`  - Regions per galaxy: ${UNIVERSE_CONFIG.regionCount}`);
    console.log(`  - Systems per region: ${UNIVERSE_CONFIG.minSystemsPerRegion}-${UNIVERSE_CONFIG.maxSystemsPerRegion}`);
    console.log(`  - Bodies per system: ${UNIVERSE_CONFIG.minBodiesPerSystem}-${UNIVERSE_CONFIG.maxBodiesPerSystem}`);
    console.log(`  - Seed: ${UNIVERSE_CONFIG.seed}`);

    for (let galaxyId = 0; galaxyId < UNIVERSE_CONFIG.galaxyCount; galaxyId++) {
      console.log(`🌌 Generating galaxy ${galaxyId}...`);

      for (let regionId = 0; regionId < UNIVERSE_CONFIG.regionCount; regionId++) {
        const systemCount = randomInt(
          UNIVERSE_CONFIG.minSystemsPerRegion,
          UNIVERSE_CONFIG.maxSystemsPerRegion,
        );

        const usedPositions = new Set<number>();

        for (let i = 0; i < systemCount; i++) {
          // Unique system position within 0..99
          let systemPosition: number;
          do {
            systemPosition = randomInt(0, 99);
          } while (usedPositions.has(systemPosition));
          usedPositions.add(systemPosition);

          // Central star (body 0)
          const starCoord = formatCoord({
            server: UNIVERSE_CONFIG.serverName,
            galaxy: galaxyId,
            region: regionId,
            system: systemPosition,
            body: 0,
          });

          const starKind = pickStarKindFromCoord(starCoord, 101);
          const orbitModifiers = Array.from({ length: 8 }, (_, idx) => {
            const pos = idx + 1;
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

          rows.push({
            coord: starCoord,
            type: 'star',
            star_overhaul: {
              kind: starKind as any,
              orbitModifiers,
              notes: undefined,
            },
            owner_id: null,
          });

          // Bodies (1..19)
          const bodyCount = randomInt(
            UNIVERSE_CONFIG.minBodiesPerSystem,
            UNIVERSE_CONFIG.maxBodiesPerSystem,
          );
          const maxBodiesForPlanets = Math.min(bodyCount, 19);

          for (let bodyId = 1; bodyId <= maxBodiesForPlanets; bodyId++) {
            const coord = formatCoord({
              server: UNIVERSE_CONFIG.serverName,
              galaxy: galaxyId,
              region: regionId,
              system: systemPosition,
              body: bodyId,
            });

            const bodyType = Math.random() < 0.7 ? 'planet' : 'asteroid';
            const SCALE = 100;
            const orbitPosition = Math.min(bodyId, 8);
            const isAsteroid = bodyType !== 'planet';
            const terrainType = pickTerrainFromCoord(coord, bodyId, isAsteroid);

            const comp = computePlanetStats({
              kind: starKind as any,
              terrain: terrainType as any,
              position: orbitPosition,
            });

            const row = {
              coord,
              type: bodyType,
              orbit_position: orbitPosition,
              terrain: {
                type: terrainType,
                baseline: comp.baselineTerrain,
              },
              position_base: comp.basePosition,
              star_applied: {
                solarEnergyDelta: comp.starMods.solarEnergyDelta,
                fertilityDelta: comp.starMods.fertilityDelta,
                resourceDelta: {
                  metal: comp.starMods.resourceDelta?.metal ?? 0,
                  gas: comp.starMods.resourceDelta?.gas ?? 0,
                  crystals: comp.starMods.resourceDelta?.crystals ?? 0,
                },
              },
              result: comp.result,
              owner_id: null,
            } as const;

            rows.push(row);
          }
        }
      }
    }

    console.log('💾 Saving locations to Supabase...');
    const batchSize = 1000;
    let saved = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase
        .from('locations')
        .upsert(batch, { onConflict: 'coord' });
      if (error) {
        throw new Error(`Upsert failed at batch starting ${i}: ${error.message}`);
      }
      saved += batch.length;
      const progress = Math.round((saved / rows.length) * 100);
      console.log(`  📊 Progress: ${progress}% (${saved}/${rows.length})`);
    }

    console.log('✅ Supabase universe generation completed successfully!');
  } finally {
    Math.random = originalRandom;
  }
}

if (require.main === module) {
  generateUniverseSupabase()
    .catch((e) => {
      console.error('💥 Script failed:', e);
      process.exit(1);
    })
    .then(() => process.exit(0));
}