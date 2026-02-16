/**
 * SQLite Database Module for Polymarket Bot
 * Persistent storage for strategies, trades, live bets, and logs
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = './data/polymarket.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better performance

// ============ Schema Migrations ============
// Add is_paper column to logs table if it doesn't exist
try {
  const logsColumns = db.prepare(`PRAGMA table_info(logs)`).all() as { name: string }[];
  const hasIsPaper = logsColumns.some(col => col.name === 'is_paper');
  if (!hasIsPaper && logsColumns.length > 0) {
    console.log('📦 Migrating logs table: adding is_paper column...');
    db.exec(`ALTER TABLE logs ADD COLUMN is_paper INTEGER DEFAULT 0`);
    console.log('📦 Migration complete');
  }
} catch (e) {
  // Table might not exist yet, which is fine
}

// ============ Schema ============
db.exec(`
  -- Strategies table: stores strategy state
  CREATE TABLE IF NOT EXISTS strategies (
    id TEXT NOT NULL,
    market_key TEXT NOT NULL,
    name TEXT NOT NULL,
    -- Paper trading stats
    balance REAL DEFAULT 0,
    starting_balance REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    total_markets INTEGER DEFAULT 0,
    deployed REAL DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    -- Live trading stats
    live_mode INTEGER DEFAULT 0,
    live_allocation REAL DEFAULT 0,
    live_balance REAL DEFAULT 0,
    live_deployed REAL DEFAULT 0,
    live_pnl REAL DEFAULT 0,
    live_wins INTEGER DEFAULT 0,
    live_losses INTEGER DEFAULT 0,
    -- Control
    halted INTEGER DEFAULT 0,
    halted_reason TEXT,
    stop_loss_threshold REAL DEFAULT 0,
    -- Meta
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, market_key)
  );

  -- Trades table: all trade history
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    strategy_id TEXT NOT NULL,
    market_key TEXT NOT NULL,
    market_id TEXT NOT NULL,
    -- Trade details
    side TEXT NOT NULL,
    shares REAL NOT NULL,
    cost REAL NOT NULL,
    payout REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    result TEXT,
    -- Asset prices
    asset_open REAL,
    asset_close REAL,
    -- Type
    is_live INTEGER DEFAULT 0,
    -- Meta
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Live bets table: ongoing live bets that need tracking
  CREATE TABLE IF NOT EXISTS live_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_id TEXT NOT NULL,
    market_key TEXT NOT NULL,
    market_id TEXT NOT NULL,
    -- Bet details
    condition_id TEXT,
    token_id TEXT,
    order_id TEXT,
    side TEXT NOT NULL,
    amount REAL NOT NULL,
    price REAL NOT NULL,
    shares REAL NOT NULL,
    -- Status
    status TEXT DEFAULT 'pending', -- pending, resolved, redeemed, failed
    result TEXT, -- WIN, LOSS
    payout REAL DEFAULT 0,
    -- Meta
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    redeemed_at TEXT
  );

  -- Logs table: activity logs for debugging
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL, -- info, warn, error, debug
    category TEXT NOT NULL, -- strategy, trade, redeem, system, live, paper
    strategy_id TEXT,
    market_key TEXT,
    is_paper INTEGER DEFAULT 0, -- 1 = paper trading, 0 = live/system
    message TEXT NOT NULL,
    data TEXT, -- JSON data
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy_id, market_key);
  CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
  CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
  CREATE INDEX IF NOT EXISTS idx_live_bets_status ON live_bets(status);
  CREATE INDEX IF NOT EXISTS idx_live_bets_strategy ON live_bets(strategy_id);
  CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
`);

// ============ Strategy Operations ============
export interface StrategyRecord {
  id: string;
  market_key: string;
  name: string;
  balance: number;
  starting_balance: number;
  total_pnl: number;
  total_markets: number;
  deployed: number;
  wins: number;
  losses: number;
  live_mode: boolean;
  live_allocation: number;
  live_balance: number;
  live_deployed: number;
  live_pnl: number;
  live_wins: number;
  live_losses: number;
  halted: boolean;
  halted_reason?: string;
  stop_loss_threshold: number;
}

const upsertStrategy = db.prepare(`
  INSERT INTO strategies (
    id, market_key, name, balance, starting_balance, total_pnl, total_markets,
    deployed, wins, losses, live_mode, live_allocation, live_balance,
    live_deployed, live_pnl, live_wins, live_losses, halted, halted_reason,
    stop_loss_threshold, updated_at
  ) VALUES (
    @id, @market_key, @name, @balance, @starting_balance, @total_pnl, @total_markets,
    @deployed, @wins, @losses, @live_mode, @live_allocation, @live_balance,
    @live_deployed, @live_pnl, @live_wins, @live_losses, @halted, @halted_reason,
    @stop_loss_threshold, datetime('now')
  ) ON CONFLICT(id, market_key) DO UPDATE SET
    name = @name, balance = @balance, starting_balance = @starting_balance,
    total_pnl = @total_pnl, total_markets = @total_markets, deployed = @deployed,
    wins = @wins, losses = @losses, live_mode = @live_mode, live_allocation = @live_allocation,
    live_balance = @live_balance, live_deployed = @live_deployed, live_pnl = @live_pnl,
    live_wins = @live_wins, live_losses = @live_losses, halted = @halted,
    halted_reason = @halted_reason, stop_loss_threshold = @stop_loss_threshold,
    updated_at = datetime('now')
`);

export function saveStrategy(strategy: StrategyRecord): void {
  upsertStrategy.run({
    ...strategy,
    live_mode: strategy.live_mode ? 1 : 0,
    halted: strategy.halted ? 1 : 0,
  });
}

const getStrategy = db.prepare(`
  SELECT * FROM strategies WHERE id = ? AND market_key = ?
`);

export function loadStrategy(id: string, marketKey: string): StrategyRecord | null {
  const row = getStrategy.get(id, marketKey) as any;
  if (!row) return null;
  return {
    ...row,
    live_mode: row.live_mode === 1,
    halted: row.halted === 1,
  };
}

const getAllStrategies = db.prepare(`
  SELECT * FROM strategies WHERE market_key = ?
`);

export function loadStrategiesForMarket(marketKey: string): StrategyRecord[] {
  const rows = getAllStrategies.all(marketKey) as any[];
  return rows.map(row => ({
    ...row,
    live_mode: row.live_mode === 1,
    halted: row.halted === 1,
  }));
}

// ============ Trade Operations ============
export interface TradeRecord {
  id: string;
  strategy_id: string;
  market_key: string;
  market_id: string;
  side: 'Up' | 'Down';
  shares: number;
  cost: number;
  payout: number;
  pnl: number;
  result: 'WIN' | 'LOSS' | null;
  asset_open: number;
  asset_close: number;
  is_live: boolean;
}

const insertTrade = db.prepare(`
  INSERT INTO trades (
    id, strategy_id, market_key, market_id, side, shares, cost, payout, pnl,
    result, asset_open, asset_close, is_live, created_at
  ) VALUES (
    @id, @strategy_id, @market_key, @market_id, @side, @shares, @cost, @payout, @pnl,
    @result, @asset_open, @asset_close, @is_live, datetime('now')
  )
`);

export function saveTrade(trade: TradeRecord): void {
  try {
    insertTrade.run({
      ...trade,
      is_live: trade.is_live ? 1 : 0,
    });
  } catch (e: any) {
    // Ignore duplicate key errors
    if (!e.message.includes('UNIQUE constraint')) throw e;
  }
}

const getTradesForStrategy = db.prepare(`
  SELECT * FROM trades WHERE strategy_id = ? AND market_key = ?
  ORDER BY created_at DESC LIMIT ?
`);

export function loadTradesForStrategy(strategyId: string, marketKey: string, limit = 50): TradeRecord[] {
  const rows = getTradesForStrategy.all(strategyId, marketKey, limit) as any[];
  return rows.map(row => ({
    ...row,
    is_live: row.is_live === 1,
  }));
}

// ============ Live Bet Operations ============
export interface LiveBetRecord {
  id?: number;
  strategy_id: string;
  market_key: string;
  market_id: string;
  condition_id?: string;
  token_id?: string;
  order_id?: string;
  side: 'Up' | 'Down';
  amount: number;
  price: number;
  shares: number;
  status: 'pending' | 'resolved' | 'redeemed' | 'failed';
  result?: 'WIN' | 'LOSS';
  payout?: number;
}

const insertLiveBet = db.prepare(`
  INSERT INTO live_bets (
    strategy_id, market_key, market_id, condition_id, token_id, order_id,
    side, amount, price, shares, status, created_at
  ) VALUES (
    @strategy_id, @market_key, @market_id, @condition_id, @token_id, @order_id,
    @side, @amount, @price, @shares, @status, datetime('now')
  )
`);

export function saveLiveBet(bet: LiveBetRecord): number {
  const result = insertLiveBet.run(bet);
  return result.lastInsertRowid as number;
}

const updateLiveBetStatus = db.prepare(`
  UPDATE live_bets SET status = ?, result = ?, payout = ?, resolved_at = datetime('now')
  WHERE id = ?
`);

export function resolveLiveBet(id: number, result: 'WIN' | 'LOSS', payout: number): void {
  updateLiveBetStatus.run('resolved', result, payout, id);
}

const markLiveBetRedeemed = db.prepare(`
  UPDATE live_bets SET status = 'redeemed', redeemed_at = datetime('now') WHERE id = ?
`);

export function redeemLiveBet(id: number): void {
  markLiveBetRedeemed.run(id);
}

const getPendingLiveBets = db.prepare(`
  SELECT * FROM live_bets WHERE status = 'pending'
`);

export function loadPendingLiveBets(): LiveBetRecord[] {
  return getPendingLiveBets.all() as LiveBetRecord[];
}

const getLiveBetsForMarket = db.prepare(`
  SELECT * FROM live_bets WHERE market_id = ? AND status = 'pending'
`);

export function loadLiveBetsForMarket(marketId: string): LiveBetRecord[] {
  return getLiveBetsForMarket.all(marketId) as LiveBetRecord[];
}

// Additional functions for bet-tracker.ts
const liveBetsByStatusStmt = db.prepare(`
  SELECT * FROM live_bets WHERE status = ?
`);

export function getLiveBetsByStatus(status: string): LiveBetRecord[] {
  return liveBetsByStatusStmt.all(status) as LiveBetRecord[];
}

const allLiveBetsStmt = db.prepare(`
  SELECT * FROM live_bets ORDER BY created_at DESC
`);

export function getAllLiveBets(): LiveBetRecord[] {
  return allLiveBetsStmt.all() as LiveBetRecord[];
}

const recentLiveBetsStmt = db.prepare(`
  SELECT * FROM live_bets ORDER BY created_at DESC LIMIT ?
`);

export function getRecentLiveBets(limit: number): LiveBetRecord[] {
  return recentLiveBetsStmt.all(limit) as LiveBetRecord[];
}

// Use the existing prepared statement from line 288 (updateLiveBetStatus)
export function updateLiveBetStatusById(id: number, status: string, result: string, payout: number): void {
  updateLiveBetStatus.run(status, result, payout, id);
}

// Get live bets stats for reporting
const liveBetsStatsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) as redeemed,
    SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
    SUM(amount) as total_bet,
    SUM(COALESCE(payout, 0)) as total_payout
  FROM live_bets
`);

export function getLiveBetsStats(): {
  total: number;
  pending: number;
  resolved: number;
  redeemed: number;
  wins: number;
  losses: number;
  totalBet: number;
  totalPayout: number;
} {
  const row = liveBetsStatsStmt.get() as any;
  return {
    total: row.total || 0,
    pending: row.pending || 0,
    resolved: row.resolved || 0,
    redeemed: row.redeemed || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    totalBet: row.total_bet || 0,
    totalPayout: row.total_payout || 0,
  };
}

// ============ Logging Operations ============
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'strategy' | 'trade' | 'redeem' | 'system' | 'live' | 'paper';

const insertLog = db.prepare(`
  INSERT INTO logs (level, category, strategy_id, market_key, is_paper, message, data, created_at)
  VALUES (@level, @category, @strategy_id, @market_key, @is_paper, @message, @data, datetime('now'))
`);

export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: any,
  strategyId?: string,
  marketKey?: string,
  isPaper: boolean = false
): void {
  insertLog.run({
    level,
    category,
    strategy_id: strategyId || null,
    market_key: marketKey || null,
    is_paper: isPaper ? 1 : 0,
    message,
    data: data ? JSON.stringify(data) : null,
  });
}

// Convenience logging functions
export const dbLog = {
  debug: (cat: LogCategory, msg: string, data?: any, stratId?: string, mktKey?: string, isPaper?: boolean) =>
    log('debug', cat, msg, data, stratId, mktKey, isPaper),
  info: (cat: LogCategory, msg: string, data?: any, stratId?: string, mktKey?: string, isPaper?: boolean) =>
    log('info', cat, msg, data, stratId, mktKey, isPaper),
  warn: (cat: LogCategory, msg: string, data?: any, stratId?: string, mktKey?: string, isPaper?: boolean) =>
    log('warn', cat, msg, data, stratId, mktKey, isPaper),
  error: (cat: LogCategory, msg: string, data?: any, stratId?: string, mktKey?: string, isPaper?: boolean) =>
    log('error', cat, msg, data, stratId, mktKey, isPaper),
  // Live-specific logging (shorter retention)
  live: (level: LogLevel, msg: string, data?: any, stratId?: string, mktKey?: string) =>
    log(level, 'live', msg, data, stratId, mktKey, false),
  // Paper-specific logging (minimal retention)
  paper: (level: LogLevel, msg: string, data?: any, stratId?: string, mktKey?: string) =>
    log(level, 'paper', msg, data, stratId, mktKey, true),
};

const getLogs = db.prepare(`
  SELECT * FROM logs
  WHERE (@level IS NULL OR level = @level)
    AND (@category IS NULL OR category = @category)
    AND (@strategy_id IS NULL OR strategy_id = @strategy_id)
    AND (@is_paper IS NULL OR is_paper = @is_paper)
  ORDER BY created_at DESC
  LIMIT @limit
`);

export function queryLogs(options: {
  level?: LogLevel;
  category?: LogCategory;
  strategyId?: string;
  limit?: number;
  isPaper?: boolean;
}): any[] {
  return getLogs.all({
    level: options.level || null,
    category: options.category || null,
    strategy_id: options.strategyId || null,
    is_paper: options.isPaper === undefined ? null : (options.isPaper ? 1 : 0),
    limit: options.limit || 100,
  });
}

// Cleanup old logs - different retention for paper vs live
// Paper logs: keep 1 day (we don't care much about them)
// Live logs: keep 30 days (important for analysis)
// System logs: keep 7 days
const cleanupPaperLogs = db.prepare(`
  DELETE FROM logs WHERE is_paper = 1 AND created_at < datetime('now', '-1 days')
`);

const cleanupLiveLogs = db.prepare(`
  DELETE FROM logs WHERE category = 'live' AND created_at < datetime('now', '-30 days')
`);

const cleanupSystemLogs = db.prepare(`
  DELETE FROM logs WHERE is_paper = 0 AND category != 'live' AND created_at < datetime('now', '-7 days')
`);

export function cleanupOldLogs(): { paper: number; live: number; system: number } {
  const paper = cleanupPaperLogs.run().changes;
  const live = cleanupLiveLogs.run().changes;
  const system = cleanupSystemLogs.run().changes;
  return { paper, live, system };
}

// ============ Stats ============
const getStats = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM strategies) as total_strategies,
    (SELECT COUNT(*) FROM strategies WHERE live_mode = 1) as live_strategies,
    (SELECT COUNT(*) FROM trades) as total_trades,
    (SELECT COUNT(*) FROM trades WHERE is_live = 1) as live_trades,
    (SELECT COUNT(*) FROM live_bets WHERE status = 'pending') as pending_bets,
    (SELECT COUNT(*) FROM logs) as total_logs
`);

export function getDbStats(): any {
  return getStats.get();
}

// Export db for direct access if needed
export { db };

console.log('📦 Database initialized:', DB_PATH);
