import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { DefenseQueue } from '../models/DefenseQueue';
import { Location } from '../models/Location';
import { User } from '../models/User';

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type Maybe<T> = T | null | undefined;

function formatNumber(n: Maybe<number>): string {
  if (n === null || n === undefined) return 'n/a';
  return String(n);
}

function minutesUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 60000));
}

function usage(): never {
  console.log('Usage: npx --yes ts-node packages/server/src/scripts/reportDefensesAtCoord.ts [--json] <COORD>');
  console.log('Example: npx --yes ts-node packages/server/src/scripts/reportDefensesAtCoord.ts A00:00:12:02');
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
    console.error('Invalid coordinate format. Expected e.g. A00:00:12:02');
    usage();
  }

  return { outputJson, coord };
}

async function main() {
  const { outputJson, coord } = parseArgs();

  // Optional mapping from defenseKey -> name via shared catalog
  const defenseNameByKey: Record<string, string> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const shared = require('@game/shared');
    if (typeof shared.getDefensesList === 'function') {
      for (const spec of shared.getDefensesList()) {
        if (spec && spec.key) defenseNameByKey[String(spec.key)] = String(spec.name || spec.key);
      }
    }
  } catch {
    // ignore - mapping stays empty
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected.');
  // Touch to ensure types are preserved and populate works
  void User;

  try {
    const location = await Location.findOne({ coord })
      .populate('owner', 'username')
      .lean();

    const items = (await DefenseQueue.find({ locationCoord: coord })
      .sort({ createdAt: 1 })
      .lean()) as Array<{
      _id: mongoose.Types.ObjectId;
      defenseKey: string;
      status: 'pending' | 'completed' | 'cancelled';
      startedAt?: Date | null;
      completesAt?: Date | null;
      createdAt?: Date | null;
    }>;

    const now = Date.now();
    let pending = 0;
    let waiting = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    const detailed = items.map((it) => {
      const id = it._id?.toString?.() || '';
      const key = String(it.defenseKey || '');
      const name = defenseNameByKey[key] || key;
      const status = it.status;
      const startedAt = it.startedAt ? new Date(it.startedAt) : null;
      const completesAt = it.completesAt ? new Date(it.completesAt) : null;
      const etaMin = minutesUntil(completesAt || null);

      if (status === 'pending') {
        pending++;
        if (completesAt && completesAt.getTime() > now) inProgress++;
        else waiting++;
      } else if (status === 'completed') {
        completed++;
      } else if (status === 'cancelled') {
        cancelled++;
      }

      return {
        id,
        defenseKey: key,
        name,
        status,
        startedAt,
        completesAt,
        etaMinutes: typeof etaMin === 'number' ? etaMin : null,
      };
    });

    const summary = {
      coordinate: coord,
      owner: location && (location as any).owner ? (location as any).owner.username : null,
      counts: {
        total: items.length,
        pending,
        inProgress,
        waiting,
        completed,
        cancelled,
      },
    };

    if (outputJson) {
      console.log(JSON.stringify({ summary, items: detailed }, null, 2));
      return;
    }

    // Human-readable output
    console.log('='.repeat(64));
    console.log(`Defenses at ${coord}`);
    if (!location) {
      console.log('Location: NOT FOUND');
    } else {
      const type = (location as any).type || 'unknown';
      const owner = (location as any).owner?.username || null;
      console.log(`Location: ${type}${owner ? ` (owner: ${owner})` : ''}`);
    }

    if (items.length === 0) {
      console.log('No defense queue entries found at this base.');
    } else {
      console.log(`Summary -> pending=${pending} (in-progress=${inProgress}, waiting=${waiting}), completed=${completed}, cancelled=${cancelled}`);
      console.log('');
      for (const it of detailed) {
        const tag = it.status === 'pending'
          ? (it.completesAt ? 'in-progress' : 'waiting')
          : it.status;
        const etaStr = it.etaMinutes !== null ? `, ETA ~${it.etaMinutes}m` : '';
        console.log(`- [${tag}] ${it.name} (key=${it.defenseKey})${etaStr}`);
      }
    }
    console.log('='.repeat(64));
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((err) => {
  console.error('Error reporting defenses at coord:', err);
  process.exit(1);
});