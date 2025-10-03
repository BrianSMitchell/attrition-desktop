import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../models/User';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  // Minimal arg parsing
  const args = process.argv.slice(2);
  let email = '';
  let username = '';
  let password = '';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--email=')) email = a.substring('--email='.length);
    else if (a === '--email' && i + 1 < args.length) email = args[++i];
    else if (a.startsWith('--username=')) username = a.substring('--username='.length);
    else if (a === '--username' && i + 1 < args.length) username = args[++i];
    else if (a.startsWith('--password=')) password = a.substring('--password='.length);
    else if (a === '--password' && i + 1 < args.length) password = args[++i];
  }

  if (!email || !username || !password) {
    console.error('Usage: ts-node ensureUser.ts --email <email> --username <name> --password <pwd>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 45000 });

  try {
    const existing = await User.findOne({ email }).select('+passwordHash');

    if (existing) {
      existing.username = existing.username || username;
      // IMPORTANT: Do NOT pre-hash here. The User model pre-save hook will hash passwordHash.
      existing.passwordHash = password;
      // Ensure minimal gameProfile exists
      existing.gameProfile = existing.gameProfile || { credits: 100, experience: 0 } as any;
      await existing.save();
      console.log(JSON.stringify({ updated: true, email, username: existing.username }, null, 2));
    } else {
      const user = new User({
        email,
        username,
        // IMPORTANT: Do NOT pre-hash here. The User model pre-save hook will hash passwordHash.
        passwordHash: password,
        gameProfile: { credits: 100, experience: 0 },
      });
      await user.save();
      console.log(JSON.stringify({ created: true, email, username }, null, 2));
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('ensureUser failed:', err);
  process.exit(1);
});