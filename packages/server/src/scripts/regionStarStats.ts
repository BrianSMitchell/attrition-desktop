import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Location } from '../models/Location';
import { connectDatabase } from '../config/database';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

function usage() {
  console.log('Usage: ts-node regionStarStats.ts <serverLetter> <galaxy 0-39> <region 0-99>');
  console.log('Example: ts-node regionStarStats.ts A 0 13');
}

function pad2(n: number | string) {
  const s = typeof n === 'number' ? n.toString() : n;
  return s.padStart(2, '0');
}

function parseSystemFromCoord(coord: string): number | null {
  // Coord format: Sgg:rr:ss:bb
  const m = coord.match(/^[A-Z](\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const system = Number(m[3]);
  return Number.isNaN(system) ? null : system;
}

async function main() {
  const [server, galaxyArg, regionArg] = process.argv.slice(2);

  if (!server || server.length !== 1 || galaxyArg === undefined || regionArg === undefined) {
    usage();
    process.exit(1);
  }

  const galaxy = Number(galaxyArg);
  const region = Number(regionArg);

  if (
    Number.isNaN(galaxy) || galaxy < 0 || galaxy > 39 ||
    Number.isNaN(region) || region < 0 || region > 99
  ) {
    console.error('Invalid galaxy/region. Galaxy must be 0–39, Region must be 0–99.');
    process.exit(1);
  }

  const gg = pad2(galaxy);
  const rr = pad2(region);
  const starPattern = new RegExp(`^${server}${gg}:${rr}:\\d{2}:00$`);

  try {
    await connectDatabase();

    const stars = await Location.find({
      type: 'star',
      coord: { $regex: starPattern }
    })
      .sort({ coord: 1 })
      .lean();

    const systems = stars
      .map(s => parseSystemFromCoord(s.coord))
      .filter((n): n is number => n !== null);

    console.log(`Region ${server}${gg}:${rr} star systems: ${systems.length}`);
    if (systems.length > 0) {
      console.log('System IDs:', systems.join(', '));
    } else {
      console.log('No stars found in this region.');
    }

    // Additional validation: Star kind distribution and orbit modifier sample
    if (stars.length > 0) {
      const kindRows = await Location.aggregate<{ _id: string; count: number }>([
        { $match: { type: 'star', coord: { $regex: starPattern } } },
        { $group: { _id: '$starOverhaul.kind', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      console.log('⭐ Star Kind Distribution in Region:');
      if (kindRows.length === 0) {
        console.log('  (no starOverhaul.kind data found)');
      } else {
        kindRows.forEach((r) => console.log(`  - ${r._id}: ${r.count}`));
      }

      // Sample one star's orbit modifiers for spot-check
      const sample = await Location.findOne({
        type: 'star',
        coord: { $regex: starPattern }
      })
        .select('coord starOverhaul.kind starOverhaul.orbitModifiers')
        .lean() as any;

      if (sample?.starOverhaul) {
        const mods = (sample.starOverhaul.orbitModifiers || []) as Array<any>;
        console.log(
          `🧪 Sample star ${sample.coord} ${sample.starOverhaul.kind}: ${mods.length} orbit modifiers`
        );
        const preview = mods.slice(0, 3).map((m) => {
          const r = m.resourceDelta || { metal: 0, gas: 0, crystals: 0 };
          return `P${m.position}(ΔE=${m.solarEnergyDelta}, ΔF=${m.fertilityDelta}, ΔR=${r.metal}/${r.gas}/${r.crystals})`;
        });
        if (preview.length > 0) {
          console.log(`  Preview: ${preview.join(', ')}`);
        }
      }
    }
  } catch (err) {
    console.error('Error running regionStarStats:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
