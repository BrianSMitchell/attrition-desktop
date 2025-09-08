import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Location } from '../models/Location';
import { User } from '../models/User'; // ensure model is registered for populate

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type Maybe<T> = T | null | undefined;

function formatNumber(n: Maybe<number>): string {
  if (n === null || n === undefined) return 'n/a';
  return String(n);
}

function usage(): never {
  console.log('Usage: ts-node packages/server/src/scripts/inspectLocation.ts [--json] <COORD>');
  console.log('Example: npx --yes ts-node packages/server/src/scripts/inspectLocation.ts A00:00:12:01');
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

  // Range validation aligned with Location schema
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

async function main() {
  const { outputJson, coord, starCoord } = parseArgs();

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/space-empire-mmo';

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected.');
  // Touch to avoid TS removing import
  void User;

  try {
    const bodyDoc = await Location.findOne({ coord })
      .populate('owner', 'username')
      .lean();

    const starDoc = await Location.findOne({ coord: starCoord }).lean();

    const resultObj = {
      coordinate: coord,
      body: bodyDoc
        ? {
            coord: bodyDoc.coord,
            type: bodyDoc.type,
            orbitPosition: bodyDoc.orbitPosition ?? null,
            terrain: bodyDoc.terrain
              ? {
                  type: bodyDoc.terrain.type,
                  baseline: bodyDoc.terrain.baseline,
                }
              : null,
            positionBase: bodyDoc.positionBase ?? null,
            starApplied: bodyDoc.starApplied ?? null,
            result: bodyDoc.result ?? null,
            owner: bodyDoc.owner ? { username: (bodyDoc as any).owner.username } : null,

          }
        : null,
      star: starDoc
        ? {
            coord: starCoord,
            starOverhaul: starDoc.starOverhaul
              ? {
                  kind: starDoc.starOverhaul.kind,
                  // include all P1..P8 modifiers if present
                  orbitModifiers: starDoc.starOverhaul.orbitModifiers,
                  notes: starDoc.starOverhaul.notes ?? null,
                }
              : null,

          }
        : null,
    };

    if (outputJson) {
      console.log(JSON.stringify(resultObj, null, 2));
      return;
    }

    // Human-readable concise report
    console.log('='.repeat(64));
    console.log(`Coordinate: ${coord}`);
    if (!bodyDoc) {
      console.log('Body: NOT FOUND in DB');
    } else {
      console.log(`Body: ${bodyDoc.type}`);
      if (bodyDoc.terrain) {
        console.log(`Terrain: ${bodyDoc.terrain.type}`);
      }
      if (typeof bodyDoc.orbitPosition === 'number') {
        console.log(`OrbitPosition: ${bodyDoc.orbitPosition}`);
      }
      if (bodyDoc.result) {
        const r = bodyDoc.result;
        console.log(
          `Result: solarEnergy=${formatNumber(r.solarEnergy)}, fertility=${formatNumber(
            r.fertility
          )}, yields M=${formatNumber(r.yields?.metal)} G=${formatNumber(r.yields?.gas)} C=${formatNumber(
            r.yields?.crystals
          )}${r.area !== undefined ? `, area=${r.area}` : ''}`
        );
      } else {
        console.log('Result: n/a');
      }
      if (bodyDoc.owner) {
        console.log(`Owner: ${(bodyDoc as any).owner.username}`);
      } else {
        console.log('Owner: null');
      }

    }

    console.log('');
    console.log(`System Star (${starCoord}):`);
    if (!starDoc) {
      console.log('Star: NOT FOUND in DB');
    } else {
      const sk = (starDoc as any).starOverhaul?.kind ?? null;
      console.log(`starOverhaul.kind: ${sk ?? 'n/a'}`);

      const mods = (starDoc as any).starOverhaul?.orbitModifiers ?? [];
      if (Array.isArray(mods) && mods.length) {
        console.log('OrbitModifiers (P1..P8):');
        mods
          .sort((a: any, b: any) => a.position - b.position)
          .forEach((m: any) => {
            console.log(
              `  P${m.position} { solarEnergyDelta:${formatNumber(
                m.solarEnergyDelta
              )}, fertilityDelta:${formatNumber(m.fertilityDelta)}, resourceDelta:{ M:${formatNumber(
                m.resourceDelta?.metal
              )} G:${formatNumber(m.resourceDelta?.gas)} C:${formatNumber(m.resourceDelta?.crystals)} } }`
            );
          });
      } else {
        console.log('OrbitModifiers: n/a');
      }
    }
    console.log('='.repeat(64));
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((err) => {
  console.error('Error inspecting location:', err);
  process.exit(1);
});
