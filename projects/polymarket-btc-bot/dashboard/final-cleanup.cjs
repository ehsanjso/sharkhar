const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

console.log("🧹 Final cleanup - resetting all to clean state...\n");

// Reset ALL live stats to 0
db.prepare(`
  UPDATE strategies SET 
    live_balance = 0,
    live_deployed = 0,
    live_pnl = 0,
    live_wins = 0,
    live_losses = 0,
    live_mode = 0,
    live_allocation = 0
`).run();

// Set ensemble to live mode with $20
db.prepare(`
  UPDATE strategies SET 
    live_mode = 1,
    live_allocation = 20,
    live_balance = 20
  WHERE id = 'ensemble' AND market_key = 'BTC-5min'
`).run();

// Delete live_bets (old tracking data)
const betsDeleted = db.prepare("DELETE FROM live_bets").run();
console.log(`Deleted ${betsDeleted.changes} old live_bets records`);

// Show final state
console.log("\n✅ Clean state:");
const strats = db.prepare("SELECT id, live_mode, live_balance, live_pnl, live_wins, live_losses FROM strategies WHERE market_key='BTC-5min'").all();
strats.forEach(s => {
  const mode = s.live_mode ? '🔴 LIVE' : '⚪ off';
  console.log(`  ${s.id}: ${mode} | $${s.live_balance?.toFixed(2)} | ${s.live_wins}W/${s.live_losses}L`);
});

db.close();
console.log("\n✅ All paper data deleted. Only ensemble is live with $20.");
