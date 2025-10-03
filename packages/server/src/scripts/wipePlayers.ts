import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { connectDatabase } from '../config/database';

// Models (player-related)
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { Colony } from '../models/Colony';
import { Building } from '../models/Building';
import { Fleet } from '../models/Fleet';
import { ResearchProject } from '../models/ResearchProject';
import { TechQueue } from '../models/TechQueue';
import { UnitQueue } from '../models/UnitQueue';
import { DefenseQueue } from '../models/DefenseQueue';

// Optional universe model (we will keep by default)
import { Location } from '../models/Location';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { confirm?: string; dropUniverse?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--confirm=')) opts.confirm = a.substring('--confirm='.length);
    else if (a === '--confirm' && i + 1 < args.length) opts.confirm = args[++i];
    else if (a === '--drop-universe') opts.dropUniverse = true;
  }
  return opts;
}

async function main() {
  const { confirm, dropUniverse } = parseArgs();

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run in production');
    process.exit(1);
  }
  if (confirm !== 'wipe-dev') {
    console.error('❌ Confirmation flag missing. Run with --confirm wipe-dev');
    process.exit(1);
  }

  await connectDatabase();
  console.log('✅ Connected to MongoDB');

  // Show counts before
  const countsBefore = await Promise.all([
    User.countDocuments({}),
    Empire.countDocuments({}),
    Colony.countDocuments({}),
    Building.countDocuments({}),
    Fleet.countDocuments({}),
    ResearchProject.countDocuments({}),
    TechQueue.countDocuments({}),
    UnitQueue.countDocuments({}),
    DefenseQueue.countDocuments({}),
    Location.countDocuments({}),
  ]);

  console.log('📊 Before wipe:');
  console.log(`  Users=${countsBefore[0]} Empires=${countsBefore[1]} Colonies=${countsBefore[2]} Buildings=${countsBefore[3]}`);
  console.log(`  Fleets=${countsBefore[4]} ResearchProjects=${countsBefore[5]} TechQueue=${countsBefore[6]} UnitQueue=${countsBefore[7]} DefenseQueue=${countsBefore[8]}`);
  console.log(`  Locations (universe)=${countsBefore[9]}`);

  // Delete player-related data (keep universe by default)
  await Promise.all([
    User.deleteMany({}),
    Empire.deleteMany({}),
    Colony.deleteMany({}),
    Building.deleteMany({}),
    Fleet.deleteMany({}),
    ResearchProject.deleteMany({}),
    TechQueue.deleteMany({}),
    UnitQueue.deleteMany({}),
    DefenseQueue.deleteMany({}),
  ]);

  if (dropUniverse) {
    console.warn('⚠️ Dropping universe (Locations) as requested');
    await Location.deleteMany({});
  }

  // Show counts after
  const countsAfter = await Promise.all([
    User.countDocuments({}),
    Empire.countDocuments({}),
    Colony.countDocuments({}),
    Building.countDocuments({}),
    Fleet.countDocuments({}),
    ResearchProject.countDocuments({}),
    TechQueue.countDocuments({}),
    UnitQueue.countDocuments({}),
    DefenseQueue.countDocuments({}),
    Location.countDocuments({}),
  ]);

  console.log('📊 After wipe:');
  console.log(`  Users=${countsAfter[0]} Empires=${countsAfter[1]} Colonies=${countsAfter[2]} Buildings=${countsAfter[3]}`);
  console.log(`  Fleets=${countsAfter[4]} ResearchProjects=${countsAfter[5]} TechQueue=${countsAfter[6]} UnitQueue=${countsAfter[7]} DefenseQueue=${countsAfter[8]}`);
  console.log(`  Locations (universe)=${countsAfter[9]}`);

  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
