import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dashboard/data/polymarket.db');
const db = new Database(dbPath, { readonly: true });

// Find unredeemed winning bets
const unredeemed = db.prepare(`
  SELECT * FROM live_bets 
  WHERE result = 'WIN' 
  AND (status != 'redeemed' OR redeemed_at IS NULL)
  ORDER BY created_at DESC
`).all();

console.log(`Found ${unredeemed.length} potentially unredeemed winning bets:\n`);

let totalPayout = 0;
for (const bet of unredeemed as any[]) {
  console.log(`${bet.market_id}`);
  console.log(`  Side: ${bet.side}, Status: ${bet.status}`);
  console.log(`  Payout: $${bet.payout?.toFixed(2) || 'N/A'}`);
  console.log(`  Token ID: ${bet.token_id.substring(0, 20)}...`);
  console.log(`  Condition: ${bet.condition_id}`);
  console.log('');
  if (bet.payout) totalPayout += bet.payout;
}

console.log(`\nTotal potential payout: $${totalPayout.toFixed(2)}`);

db.close();
