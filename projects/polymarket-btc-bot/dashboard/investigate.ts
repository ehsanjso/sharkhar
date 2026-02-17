import Database from 'better-sqlite3';
const db = new Database('./data/polymarket.db');

// Check pending bets details
const pendingBets = db.prepare(`
  SELECT strategy_id, side, amount, shares, status, created_at
  FROM live_bets 
  WHERE status NOT IN ('redeemed')
  ORDER BY created_at DESC
`).all() as any[];

console.log(`📋 PENDING BETS (${pendingBets.length} total):\n`);

let totalByStrategy: Record<string, number> = {};
for (const b of pendingBets) {
  totalByStrategy[b.strategy_id] = (totalByStrategy[b.strategy_id] || 0) + b.amount;
}

console.log('By strategy:');
for (const [strat, total] of Object.entries(totalByStrategy)) {
  console.log(`  ${strat}: $${total.toFixed(2)} pending`);
}

console.log('\nRecent bets (last 10):');
for (const b of pendingBets.slice(0, 10)) {
  console.log(`  ${b.strategy_id}: ${b.side} $${b.amount} (${b.shares} shares) - ${b.status}`);
}

// Check strategy locked funds
const strats = db.prepare(`
  SELECT id, live_balance, locked_funds, live_deployed
  FROM strategies WHERE market_key = 'BTC-5min' AND live_mode = 1
`).all() as any[];

console.log('\n💰 STRATEGY STATE:');
for (const s of strats) {
  console.log(`  ${s.id}: balance=$${s.live_balance.toFixed(2)}, locked=$${s.locked_funds}, deployed=$${s.live_deployed}`);
}

db.close();
