import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/*
 Apply the unique index on (empireId, locationCoord, catalogKey) with a partial filter.
 Safe to run multiple times.
 Usage:
   node create-building-unique-index.js
*/

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const MONGO_URI = process.env[ENV_VARS.MONGODB_URI] || process.env.MONGO_URI || 'mongodb://localhost:27017/attrition';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected.');

  const db = mongoose.connection.db;
  const collection = db.collection('buildings');

  const indexSpec = { empireId: 1, locationCoord: 1, catalogKey: 1 };
  const indexOpts = {
    name: 'uniq_empire_base_key',
    unique: true,
    partialFilterExpression: { catalogKey: { $type: 'string' } },
    // background is ignored in modern Mongo versions; kept for compatibility
    background: true,
  };

  try {
    const existing = await collection.indexExists('uniq_empire_base_key');
    if (existing) {
      console.log('Index uniq_empire_base_key already exists. Nothing to do.');
    } else {
      console.log('Creating index uniq_empire_base_key ...');
      await collection.createIndex(indexSpec, indexOpts);
      console.log('Index created.');
    }
  } catch (err) {
    console.error('Index creation failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main().catch(async (err) => {
  console.error('Script error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
