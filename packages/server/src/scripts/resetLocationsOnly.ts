import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Location } from '../models/Location';
import { connectDatabase } from '../config/database';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  try {
    console.log('🧹 Reset Locations Only Script');
    console.log('==============================');

    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    const count = await Location.countDocuments();
    console.log(`📊 Current Location documents: ${count.toLocaleString()}`);

    if (count === 0) {
      console.log('✅ No Location documents to delete.');
    } else {
      console.log('🗑️  Deleting ALL Location documents (stars, planets, asteroids) ...');
      const result = await Location.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount?.toLocaleString() ?? 0} Location documents.`);
    }
  } catch (err) {
    console.error('❌ Error resetting locations:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
