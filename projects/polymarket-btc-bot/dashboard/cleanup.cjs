const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

console.log("🧹 Cleaning paper trading data...\n");

// Reset paper trading stats in strategies (keep only live data)
console.log("Resetting paper stats in strategies...");
db.prepare(`
  UPDATE strategies SET 
    balance = starting_balance,
    total_pnl = 0,
    total_markets = 0,
    deployed = 0,
    wins = 0,
    losses = 0,
    win_rate = 0,
    roi = 0
`).run();

// Delete all logs
const logsDeleted = db.prepare("DELETE FROM logs").run();
console.log(`Deleted ${logsDeleted.changes} log entries`);

// Delete trades that aren't live
const tradesDeleted = db.prepare("DELETE FROM trades WHERE mode != 'live'").run();
console.log(`Deleted ${tradesDeleted.changes} paper trades`);

// Show remaining live data
console.log("\n✅ Remaining live data:");
const liveStrats = db.prepare("SELECT id, market_key, live_mode, live_balance, live_pnl, live_wins, live_losses FROM strategies WHERE market_key='BTC-5min'").all();
liveStrats.forEach(s => {
  console.log(`  ${s.id}: live=${s.live_mode}, balance=$${s.live_balance?.toFixed(2)}, pnl=$${s.live_pnl?.toFixed(2)}, ${s.live_wins}W/${s.live_losses}L`);
});

const liveBets = db.prepare("SELECT COUNT(*) as count FROM live_bets").get();
console.log(`\nLive bets tracked: ${liveBets.count}`);

db.close();
console.log("\n✅ Cleanup complete!");
