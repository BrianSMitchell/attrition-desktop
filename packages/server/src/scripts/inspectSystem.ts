import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Location } from '../models/Location';
import { User } from '../models/User'; // register User model for populate

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function pad2(n: number | string): string {
  const s = typeof n === 'number' ? n.toString() : n;
  return s.padStart(2, '0');
}

async function main() {
  const [serverArg, galaxyArg, regionArg, systemArg] = process.argv.slice(2);

  const server = (serverArg || 'A').toUpperCase();
  const galaxy = Number.isFinite(Number(galaxyArg)) ? Number(galaxyArg) : 0;
  const region = Number.isFinite(Number(regionArg)) ? Number(regionArg) : 0;
  const system = Number.isFinite(Number(systemArg)) ? Number(systemArg) : 0;

  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';

  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected.');
  // Touch the model to avoid TS unused import removal
  void User;

  try {
    const coordPrefix = `^${server}${pad2(galaxy)}:${pad2(region)}:${pad2(system)}:`;

    const bodies = await Location.find({
      coord: { $regex: coordPrefix },
    })
      .populate('owner', 'username')
      .sort({ coord: 1 })
      .lean();

    const summary = bodies.map((b: any) => ({
      coord: b.coord,
      type: b.type,
      owner: b.owner ? { username: b.owner.username } : null,
      hasColony: Boolean(b.owner),
    }));

    const counts = summary.reduce(
      (acc: { total: number; planets: number; asteroids: number; stars: number; colonies: number }, b: any) => {
        acc.total += 1;
        if (b.type === 'planet') acc.planets += 1;
        if (b.type === 'asteroid') acc.asteroids += 1;
        if (b.type === 'star') acc.stars += 1;
        if (b.owner) acc.colonies += 1;
        return acc;
      },
      { total: 0, planets: 0, asteroids: 0, stars: 0, colonies: 0 }
    );

    const detailed = bodies.map((b: any) => ({
      coord: b.coord,
      type: b.type,
      owner: b.owner ? { username: b.owner.username } : null,
      orbitPosition: b.orbitPosition ?? null,
      terrain: b.terrain ?? null,
      positionBase: b.positionBase ?? null,
      starApplied: b.starApplied ?? null,
      result: b.result ?? null,
      starOverhaul: b.starOverhaul ?? null,
    }));

    const starBody = bodies.find((b: any) => b.type === 'star');
    const starKind = (starBody && starBody.starOverhaul && starBody.starOverhaul.kind) || null;

    console.log(
      JSON.stringify(
        {
          system: {
            server,
            galaxy,
            region,
            system,
          },
          counts,
          starKind,
          summary,
          detailed,
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((err) => {
  console.error('Error inspecting system:', err);
  process.exit(1);
});
