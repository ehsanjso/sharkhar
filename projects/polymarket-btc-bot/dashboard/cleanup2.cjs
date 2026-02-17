const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

// Check trades table structure
const cols = db.prepare("PRAGMA table_info(trades)").all();
console.log("Trades columns:", cols.map(c => c.name).join(", "));

// Delete all trades (they're paper)
const tradesDeleted = db.prepare("DELETE FROM trades").run();
console.log(`Deleted ${tradesDeleted.changes} trades`);

// Delete old markets
const marketsDeleted = db.prepare("DELETE FROM markets").run();
console.log(`Deleted ${marketsDeleted.changes} markets`);

// Show final state
console.log("\n✅ Final state:");
const strats = db.prepare("SELECT id, market_key, live_mode, live_balance FROM strategies WHERE market_key='BTC-5min'").all();
strats.forEach(s => {
  console.log(`  ${s.id}: live=${s.live_mode}, balance=$${s.live_balance?.toFixed(2)}`);
});

db.close();
