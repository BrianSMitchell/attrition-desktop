import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Location } from '../models/Location';

import {
  computePlanetStats,
  getStarKindModifiers,
  getBasePosition,
  TERRAIN_BASELINES,
  type StarKind,
  type TerrainType,
} from '@game/shared';

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type Maybe<T> = T | null | undefined;

function formatNumber(n: Maybe<number>): string {
  if (n === null || n === undefined) return 'n/a';
  return String(n);
}

function usage(): never {
  console.log('Usage: ts-node packages/server/src/scripts/verifyLocationComputation.ts [--json] <COORD>');
  console.log('Example: npx --yes ts-node packages/server/src/scripts/verifyLocationComputation.ts A00:00:12:01');
  process.exit(1);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const jsonFlagIndex = argv.indexOf('--json');
  const outputJson = jsonFlagIndex !== -1;
  if (outputJson) argv.splice(jsonFlagIndex, 1);

  const coord = argv[0];
  if (!coord) usage();

  const match = coord.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    console.error('Invalid coordinate format. Expected e.g. A00:00:12:01');
    usage();
  }

  const server = match![1];
  const galaxy = parseInt(match![2], 10);
  const region = parseInt(match![3], 10);
  const system = parseInt(match![4], 10);
  const body = parseInt(match![5], 10);

  if (
    galaxy < 0 || galaxy > 39 ||
    region < 0 || region > 99 ||
    system < 0 || system > 99 ||
    body < 0 || body > 19
  ) {
    console.error('Coordinate values out of range (check galaxy 00-39, region 00-99, system 00-99, body 00-19).');
    usage();
  }

  // Star is always body 00 in this system
  const starCoord = `${server}${match![2]}:${match![3]}:${match![4]}:00`;

  return { outputJson, coord, starCoord };
}

function numberEquals(a: Maybe<number>, b: Maybe<number>): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === null && b === null) return true;
  return a === b;
}

async function verify(coord: string, starCoord: string, outputJson: boolean) {
  const bodyDoc = await Location.findOne({ coord }).lean();
  if (!bodyDoc) {
    throw new Error(`No body found for coord ${coord}`);
  }

  const starDoc = await Location.findOne({ coord: starCoord }).lean();
  if (!starDoc) {
    throw new Error(`No star found for system ${starCoord}`);
  }

  const kind = (starDoc as any).starOverhaul?.kind as StarKind | undefined;
  if (!kind) {
    throw new Error(`Missing starOverhaul.kind on star ${starCoord}`);
  }

  const terrain = bodyDoc.terrain?.type as TerrainType | undefined;
  if (!terrain) {
    throw new Error(`Missing terrain.type on body ${coord}`);
  }

  const position = (bodyDoc.orbitPosition as number) ?? 1;

  // Compute expected result from canonical function
  const expected = computePlanetStats({ kind, terrain, position });

  // Persisted result from DB
  const persisted = bodyDoc.result;

  // Build components breakdown
  const terrainBase = TERRAIN_BASELINES[terrain];
  const baseByPosition = getBasePosition(position);
  const starMods = getStarKindModifiers(kind, position);

  const equal =
    !!persisted &&
    numberEquals(persisted!.solarEnergy, expected.result.solarEnergy) &&
    numberEquals(persisted!.fertility, expected.result.fertility) &&
    numberEquals(persisted!.yields?.metal, expected.result.yields.metal) &&
    numberEquals(persisted!.yields?.gas, expected.result.yields.gas) &&
    numberEquals(persisted!.yields?.crystals, expected.result.yields.crystals) &&
    numberEquals(persisted!.area, expected.result.area);

  const resultObj = {
    equal,
    coord,
    inputs: { kind, terrain, position },
    components: {
      terrainBaseline: {
        fertility: terrainBase?.fertility ?? 0,
        yields: {
          metal: terrainBase?.metal ?? 0,
          gas: terrainBase?.gas ?? 0,
          crystals: terrainBase?.crystals ?? 0,
        },
        area: terrainBase?.areaPlanet ?? undefined,
      },
      baseByPosition,
      starOrbitModifiers: {
        solarEnergyDelta: starMods.solarEnergyDelta,
        fertilityDelta: starMods.fertilityDelta,
        resourceDelta: {
          metal: starMods.resourceDelta?.metal ?? 0,
          gas: starMods.resourceDelta?.gas ?? 0,
          crystals: starMods.resourceDelta?.crystals ?? 0,
        },
      },
    },
    expected: expected.result,
    persisted: persisted ?? null,
    diffs: persisted
      ? {
          solarEnergy: (persisted.solarEnergy ?? 0) - expected.result.solarEnergy,
          fertility: (persisted.fertility ?? 0) - expected.result.fertility,
          yields: {
            metal: (persisted.yields?.metal ?? 0) - expected.result.yields.metal,
            gas: (persisted.yields?.gas ?? 0) - expected.result.yields.gas,
            crystals: (persisted.yields?.crystals ?? 0) - expected.result.yields.crystals,
          },
          area: (persisted.area ?? 0) - (expected.result.area ?? 0),
        }
      : null,
  };

  if (outputJson) {
    console.log(JSON.stringify(resultObj, null, 2));
  } else {
    console.log('='.repeat(64));
    console.log(`Coordinate: ${coord}`);
    console.log(`Inputs: kind=${kind}, terrain=${terrain}, position=${position}`);
    console.log('');
    console.log('Components:');
    console.log(`  Terrain baseline: fert=${formatNumber(terrainBase?.fertility)}, yields M=${formatNumber(terrainBase?.metal)} G=${formatNumber(terrainBase?.gas)} C=${formatNumber(terrainBase?.crystals)}, area=${formatNumber(terrainBase?.areaPlanet)}`);
    console.log(`  Base-by-position: solarEnergy=${baseByPosition.solarEnergy}, fertility=${baseByPosition.fertility}`);
    console.log(`  Star mods: dSolar=${starMods.solarEnergyDelta}, dFert=${starMods.fertilityDelta}, dRes M=${formatNumber(starMods.resourceDelta?.metal)} G=${formatNumber(starMods.resourceDelta?.gas)} C=${formatNumber(starMods.resourceDelta?.crystals)}`);
    console.log('');
    console.log('Expected vs Persisted:');
    console.log(`  solarEnergy: expected=${expected.result.solarEnergy}, persisted=${formatNumber(persisted?.solarEnergy)}`);
    console.log(`  fertility:   expected=${expected.result.fertility}, persisted=${formatNumber(persisted?.fertility)}`);
    console.log(`  yields:      expected M=${expected.result.yields.metal} G=${expected.result.yields.gas} C=${expected.result.yields.crystals}, persisted M=${formatNumber(persisted?.yields?.metal)} G=${formatNumber(persisted?.yields?.gas)} C=${formatNumber(persisted?.yields?.crystals)}`);
    console.log(`  area:        expected=${formatNumber(expected.result.area)}, persisted=${formatNumber(persisted?.area)}`);
    console.log('');
    console.log(equal ? 'PASS ✅' : 'FAIL ❌');
    console.log('='.repeat(64));
  }
}

async function main() {
  const { outputJson, coord, starCoord } = parseArgs();

  // Note: This script imports @game/shared via its exports map which points to dist/.
  // Ensure the shared package has been built: pnpm --filter @game/shared build
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/space-empire-mmo';

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected.');

  try {
    await verify(coord, starCoord, outputJson);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((err) => {
  console.error('Error verifying location computation:', err);
  process.exit(1);
});
