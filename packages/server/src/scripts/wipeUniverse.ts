import { DB_TABLES } from '../constants/database-fields';

// Ensure we load env from packages/server/.env when run directly
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { server?: string } = {};
  for (const a of args) {
    if (a.startsWith('--server=')) {
      out.server = a.split('=')[1];
    }
  }
  return out;
}

async function main() {

  const { server } = parseArgs();
  const serverName = (server || 'A').toUpperCase();

  console.log(`⚠️  Wiping universe for server ${serverName} (public.locations where coord LIKE '${serverName}%')`);

  // Perform delete in batches using a range filter on coord like serverName%
  // Supabase supports direct delete with filters
  const { error, count } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .delete({ count: 'exact' })
    .like('coord', `${serverName}%`);

  if (error) {
    throw new Error(`Failed to delete locations: ${error.message}`);
  }

  console.log(`✅ Deleted ${count ?? 0} rows for server ${serverName}.`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('💥 Script failed:', e);
      process.exit(1);
    })
    .then(() => process.exit(0));
}
