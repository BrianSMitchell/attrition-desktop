import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../models/User';

// Load the server .env explicitly (script may run from repo root)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });
  console.log('Connected.');

  try {
    const users = (await User.find({}, { email: 1, username: 1, lastLogin: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean()) as Array<{ email: string; username: string; createdAt?: Date; lastLogin?: Date }>;

    if (!users.length) {
      console.log('No users found.');
    } else {
      console.log('Users (first 50):');
      for (const u of users) {
        console.log(
          JSON.stringify(
            {
              email: u.email,
              username: u.username,
              createdAt: u.createdAt,
              lastLogin: u.lastLogin,
            },
            null,
            2
          )
        );
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch((err) => {
  console.error('Error listing users:', err);
  process.exit(1);
});
