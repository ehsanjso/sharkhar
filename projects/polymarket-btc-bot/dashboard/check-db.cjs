const Database = require('better-sqlite3');
const db = new Database('./data/polymarket.db');

// Get table info
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(t => t.name));

// Get columns in strategies table
const cols = db.prepare("PRAGMA table_info(strategies)").all();
console.log("\nStrategies columns:");
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

// Sample row
const sample = db.prepare("SELECT * FROM strategies LIMIT 1").get();
console.log("\nSample row:", sample);

db.close();
