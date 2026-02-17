import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dashboard/data/polymarket.db');
const db = new Database(dbPath, { readonly: true });

// List tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

// Check for bets table
for (const t of tables as any[]) {
  console.log(`\n--- ${t.name} ---`);
  const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get() as any;
  console.log(`Row count: ${count.cnt}`);
  
  if (count.cnt > 0 && count.cnt < 20) {
    const rows = db.prepare(`SELECT * FROM ${t.name} LIMIT 5`).all();
    console.log('Sample:', JSON.stringify(rows, null, 2));
  }
}

db.close();
