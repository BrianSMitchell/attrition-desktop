import { DB_TABLES } from '../constants/database-fields';
import { supabase } from '../config/database';

// Simple CLI arg parsing: --count=NUMBER
function parseArgs() {
  const args = process.argv.slice(2);
  const out: { count?: number } = {};
  for (const a of args) {
    if (a.startsWith('--count=')) {
      const n = Number(a.split('=')[1]);
      if (!Number.isNaN(n)) out.count = n;
    }
  }
  return out;
}

async function main() {

  const { count } = parseArgs();
  const target = Math.min(count ?? 100, 2000);

  const serverId = 'A';
  const galaxy = 0; // A00
  const rows: any[] = [];

  for (let i = 1; i <= target; i++) {
    // Generate four segment coord: [A][GG]:[SS]:[YY]:[XX]
    // Keep GG fixed at 00 for now, spread across last two groups
    const seg2 = 0; // 00
    const seg3 = Math.floor((i - 1) / 10); // 00..??
    const seg4 = (i - 1) % 10; // 00..09

    const coord = `${serverId}${galaxy.toString().padStart(2, '0')}:${seg2
      .toString()
      .padStart(2, '0')}:${seg3.toString().padStart(2, '0')}:${seg4
      .toString()
      .padStart(2, '0')}`;
    rows.push({ coord, type: 'planet', owner_id: null });
  }

  console.log(`[seed] Upserting ${rows.length} unowned planets to public.locations...`);

  const { data, error, count: _ } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .upsert(rows, { onConflict: 'coord' })
    .select('coord');

  if (error) {
    console.error('ERROR: supabase upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`[seed] Done. Inserted/updated rows: ${data?.length ?? 0}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
