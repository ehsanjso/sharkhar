const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

// Show current BTC-5min strategies
console.log("Current BTC-5min strategies:");
const strats = db.prepare("SELECT id, market_key, live_mode, live_balance, live_allocation FROM strategies WHERE market_key='BTC-5min'").all();
strats.forEach(s => {
  console.log(`  ${s.id}: live_mode=${s.live_mode}, live_balance=${s.live_balance}, live_allocation=${s.live_allocation}`);
});

// Enable live mode for ensemble with $20 allocation
console.log("\nEnabling live mode for ensemble...");
db.prepare("UPDATE strategies SET live_mode = 1, live_allocation = 20, live_balance = 20 WHERE id = 'ensemble' AND market_key = 'BTC-5min'").run();

// Verify
console.log("\nAfter update:");
const updated = db.prepare("SELECT id, market_key, live_mode, live_balance, live_allocation FROM strategies WHERE market_key='BTC-5min'").all();
updated.forEach(s => {
  console.log(`  ${s.id}: live_mode=${s.live_mode}, live_balance=${s.live_balance}, live_allocation=${s.live_allocation}`);
});

db.close();
console.log("\n✅ Done! Restart the bot to apply changes.");
