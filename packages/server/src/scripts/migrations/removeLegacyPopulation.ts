import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../config/database';
import { Empire } from '../../models/Empire';
import { Colony } from '../../models/Colony';

async function run() {
  console.log('Starting migration: remove legacy population/maxPopulation/defenseLevel fields');

  await connectDatabase();

  try {
    // Purge legacy fields from empires
    const empireResult = await Empire.updateMany(
      {},
      {
        $unset: {
          population: '',
          maxPopulation: '',
        },
      },
      { strict: false }
    );

    console.log(
      `Empires updated: matched=${empireResult.matchedCount ?? (empireResult as any).n}, modified=${empireResult.modifiedCount ?? (empireResult as any).nModified}`
    );

    // Purge legacy fields from colonies
    // Using native collection to avoid any strict schema interference
    const coloniesCollection = mongoose.connection.collection('colonies');
    const colonyResult = await coloniesCollection.updateMany({}, {
      $unset: {
        population: '',
        maxPopulation: '',
        defenseLevel: '',
      },
    });

    // @ts-ignore (result type differs by Mongo driver version)
    const colonyMatched = colonyResult.matchedCount ?? colonyResult.n ?? 0;
    // @ts-ignore
    const colonyModified = colonyResult.modifiedCount ?? colonyResult.nModified ?? 0;

    console.log(`Colonies updated: matched=${colonyMatched}, modified=${colonyModified}`);

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

run();
