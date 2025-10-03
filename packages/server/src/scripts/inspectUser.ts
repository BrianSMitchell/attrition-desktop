import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../models/User';

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  // Minimal arg parsing: supports --email=value or --email value
  const args = process.argv.slice(2);
  let email = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--email=')) {
      email = a.substring('--email='.length);
      break;
    }
    if (a === '--email' && i + 1 < args.length) {
      email = args[i + 1];
      break;
    }
  }
  if (!email) {
    console.error('Usage: ts-node inspectUser.ts --email <email>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  try {
    const raw = await User.collection.findOne({ email });
    const doc = await User.findOne({ email }).select('+passwordHash').lean();

    const result = {
      found: !!raw,
      email: raw?.email ?? null,
      username: raw?.username ?? null,
      createdAt: raw?.createdAt ?? null,
      hasPasswordHash: typeof (raw as any)?.passwordHash === 'string',
      passwordHashLooksBcrypt: typeof (raw as any)?.passwordHash === 'string' ? /^\$2[aby]?\$\d{2}\$/.test((raw as any).passwordHash) : false,
      hasLegacyPasswordField: typeof (raw as any)?.password === 'string',
      // Never print actual hash or legacy password
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('inspectUser failed:', err);
  process.exit(1);
});