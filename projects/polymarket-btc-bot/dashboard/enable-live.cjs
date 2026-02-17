const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

// Check current state
const strategies = db.prepare("SELECT * FROM strategies").all();
console.log("Current strategies:");
strategies.forEach(s => {
  console.log(`  ${s.market_key}:${s.strategy_id} - live_mode=${s.live_mode}, balance=${s.balance}`);
});

// Enable live mode for ensemble with $20 balance
db.prepare("UPDATE strategies SET live_mode = 1, balance = 20 WHERE strategy_id = 'ensemble'").run();

// Verify
const updated = db.prepare("SELECT * FROM strategies WHERE strategy_id = 'ensemble'").all();
console.log("\nUpdated ensemble:");
updated.forEach(s => {
  console.log(`  ${s.market_key}:${s.strategy_id} - live_mode=${s.live_mode}, balance=${s.balance}`);
});

db.close();
