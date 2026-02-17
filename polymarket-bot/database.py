#!/usr/bin/env python3
"""
Polymarket Trading Database
Separate databases for paper and live trading.
Single source of truth: only update after market resolution.
"""

import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Database paths
DATA_DIR = Path(__file__).parent / "data"
PAPER_DB = DATA_DIR / "paper.db"
LIVE_DB = DATA_DIR / "live.db"


class TradingMode(Enum):
    PAPER = "paper"
    LIVE = "live"


@dataclass
class Trade:
    id: Optional[int]
    market_id: str
    market_question: str
    outcome: str
    side: str  # YES or NO
    amount: float  # USD spent
    price: float  # Entry price (0-1)
    shares: float  # amount / price
    status: str  # PENDING, WON, LOST, VOIDED
    placed_at: str
    resolved_at: Optional[str] = None
    payout: float = 0.0
    profit: float = 0.0
    notes: str = ""
    order_id: Optional[str] = None


@dataclass
class PortfolioSnapshot:
    """Point-in-time portfolio state"""
    id: Optional[int]
    timestamp: str
    cash: float
    total_invested: float  # Cash locked in pending trades
    realized_pnl: float
    wins: int
    losses: int
    pending: int


class TradingDatabase:
    """
    Database for tracking trades and portfolio.
    Use mode=PAPER or mode=LIVE to select database.
    """
    
    def __init__(self, mode: TradingMode):
        self.mode = mode
        self.db_path = PAPER_DB if mode == TradingMode.PAPER else LIVE_DB
        self._ensure_db()
    
    def _ensure_db(self):
        """Create database and tables if they don't exist."""
        DATA_DIR.mkdir(exist_ok=True)
        
        with self._connect() as conn:
            conn.executescript("""
                -- Trades table: every bet placed
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    market_id TEXT NOT NULL,
                    market_question TEXT,
                    outcome TEXT NOT NULL,
                    side TEXT NOT NULL CHECK(side IN ('YES', 'NO')),
                    amount REAL NOT NULL,
                    price REAL NOT NULL,
                    shares REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING' 
                        CHECK(status IN ('PENDING', 'WON', 'LOST', 'VOIDED')),
                    placed_at TEXT NOT NULL,
                    resolved_at TEXT,
                    payout REAL DEFAULT 0,
                    profit REAL DEFAULT 0,
                    notes TEXT,
                    order_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                
                -- Portfolio snapshots: track balance over time
                CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    cash REAL NOT NULL,
                    total_invested REAL NOT NULL,
                    realized_pnl REAL NOT NULL,
                    wins INTEGER NOT NULL,
                    losses INTEGER NOT NULL,
                    pending INTEGER NOT NULL
                );
                
                -- Config: starting cash, etc.
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                
                -- History log: all events
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    data TEXT,  -- JSON
                    trade_id INTEGER,
                    FOREIGN KEY (trade_id) REFERENCES trades(id)
                );
                
                -- Indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
                CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
                CREATE INDEX IF NOT EXISTS idx_history_type ON history(event_type);
            """)
    
    def _connect(self) -> sqlite3.Connection:
        """Get database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # === Config ===
    
    def get_config(self, key: str, default: str = "") -> str:
        """Get config value."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT value FROM config WHERE key = ?", (key,)
            ).fetchone()
            return row["value"] if row else default
    
    def set_config(self, key: str, value: str):
        """Set config value."""
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO config (key, value, updated_at) 
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
            """, (key, value, self._now(), value, self._now()))
            conn.commit()
    
    def get_starting_cash(self) -> float:
        """Get starting cash from config."""
        return float(self.get_config("starting_cash", "50.0"))
    
    def set_starting_cash(self, amount: float):
        """Set starting cash."""
        self.set_config("starting_cash", str(amount))
    
    # === Trades ===
    
    def add_trade(self, trade: Trade) -> int:
        """Add a new trade. Returns trade ID."""
        with self._connect() as conn:
            cursor = conn.execute("""
                INSERT INTO trades (
                    market_id, market_question, outcome, side,
                    amount, price, shares, status, placed_at,
                    notes, order_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade.market_id, trade.market_question, trade.outcome,
                trade.side, trade.amount, trade.price, trade.shares,
                trade.status, trade.placed_at, trade.notes, trade.order_id
            ))
            conn.commit()
            trade_id = cursor.lastrowid
            
            # Log event
            self._log_event("TRADE_PLACED", {
                "trade_id": trade_id,
                "market_id": trade.market_id,
                "outcome": trade.outcome,
                "side": trade.side,
                "amount": trade.amount,
                "price": trade.price,
            }, trade_id)
            
            return trade_id
    
    def get_trade(self, trade_id: int) -> Optional[Trade]:
        """Get trade by ID."""
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM trades WHERE id = ?", (trade_id,)
            ).fetchone()
            return self._row_to_trade(row) if row else None
    
    def get_pending_trades(self) -> List[Trade]:
        """Get all pending (unresolved) trades."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM trades WHERE status = 'PENDING' ORDER BY placed_at"
            ).fetchall()
            return [self._row_to_trade(row) for row in rows]
    
    def get_trades_by_market(self, market_id: str) -> List[Trade]:
        """Get all trades for a market."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM trades WHERE market_id = ? ORDER BY placed_at",
                (market_id,)
            ).fetchall()
            return [self._row_to_trade(row) for row in rows]
    
    def resolve_trade(self, trade_id: int, won: bool, payout: float = 0.0) -> Trade:
        """
        Resolve a trade as won/lost.
        This is the ONLY place P&L should be calculated.
        
        Args:
            trade_id: Trade to resolve
            won: True if bet won
            payout: Actual payout received (for wins, this is shares * $1)
        """
        trade = self.get_trade(trade_id)
        if not trade:
            raise ValueError(f"Trade {trade_id} not found")
        
        if trade.status != "PENDING":
            raise ValueError(f"Trade {trade_id} already resolved: {trade.status}")
        
        # Calculate profit from ACTUAL payout
        profit = payout - trade.amount
        status = "WON" if won else "LOST"
        
        with self._connect() as conn:
            conn.execute("""
                UPDATE trades SET
                    status = ?,
                    resolved_at = ?,
                    payout = ?,
                    profit = ?
                WHERE id = ?
            """, (status, self._now(), payout, profit, trade_id))
            conn.commit()
        
        # Log event
        self._log_event("TRADE_RESOLVED", {
            "trade_id": trade_id,
            "status": status,
            "amount": trade.amount,
            "payout": payout,
            "profit": profit,
        }, trade_id)
        
        return self.get_trade(trade_id)
    
    def void_trade(self, trade_id: int, refund: float = 0.0):
        """Mark trade as voided (market cancelled)."""
        with self._connect() as conn:
            conn.execute("""
                UPDATE trades SET
                    status = 'VOIDED',
                    resolved_at = ?,
                    payout = ?,
                    profit = ?
                WHERE id = ?
            """, (self._now(), refund, refund - self.get_trade(trade_id).amount, trade_id))
            conn.commit()
        
        self._log_event("TRADE_VOIDED", {"trade_id": trade_id, "refund": refund}, trade_id)
    
    # === Portfolio Stats ===
    
    def get_portfolio_stats(self) -> Dict[str, Any]:
        """
        Get current portfolio statistics.
        All values derived from actual resolved trades.
        """
        with self._connect() as conn:
            # Get resolved trade stats
            stats = conn.execute("""
                SELECT
                    COUNT(CASE WHEN status = 'WON' THEN 1 END) as wins,
                    COUNT(CASE WHEN status = 'LOST' THEN 1 END) as losses,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                    COUNT(*) as total_trades,
                    COALESCE(SUM(CASE WHEN status != 'PENDING' THEN profit ELSE 0 END), 0) as realized_pnl,
                    COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_invested,
                    COALESCE(SUM(amount), 0) as total_wagered
                FROM trades
            """).fetchone()
            
            starting_cash = self.get_starting_cash()
            realized_pnl = stats["realized_pnl"]
            pending_invested = stats["pending_invested"]
            
            # Cash = starting + realized P&L - pending investments
            cash = starting_cash + realized_pnl - pending_invested
            
            return {
                "mode": self.mode.value,
                "starting_cash": starting_cash,
                "cash": cash,
                "pending_invested": pending_invested,
                "realized_pnl": realized_pnl,
                "total_value": cash + pending_invested,  # Conservative: count pending at cost
                "wins": stats["wins"],
                "losses": stats["losses"],
                "pending": stats["pending"],
                "total_trades": stats["total_trades"],
                "total_wagered": stats["total_wagered"],
                "win_rate": stats["wins"] / (stats["wins"] + stats["losses"]) 
                           if (stats["wins"] + stats["losses"]) > 0 else 0,
            }
    
    def save_snapshot(self):
        """Save current portfolio state as a snapshot."""
        stats = self.get_portfolio_stats()
        
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO portfolio_snapshots (
                    timestamp, cash, total_invested, realized_pnl,
                    wins, losses, pending
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                self._now(), stats["cash"], stats["pending_invested"],
                stats["realized_pnl"], stats["wins"], stats["losses"],
                stats["pending"]
            ))
            conn.commit()
    
    # === History ===
    
    def _log_event(self, event_type: str, data: Dict, trade_id: Optional[int] = None):
        """Log an event to history."""
        import json
        with self._connect() as conn:
            conn.execute("""
                INSERT INTO history (timestamp, event_type, data, trade_id)
                VALUES (?, ?, ?, ?)
            """, (self._now(), event_type, json.dumps(data), trade_id))
            conn.commit()
    
    def get_history(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict]:
        """Get recent history events."""
        import json
        with self._connect() as conn:
            if event_type:
                rows = conn.execute("""
                    SELECT * FROM history 
                    WHERE event_type = ?
                    ORDER BY timestamp DESC LIMIT ?
                """, (event_type, limit)).fetchall()
            else:
                rows = conn.execute("""
                    SELECT * FROM history ORDER BY timestamp DESC LIMIT ?
                """, (limit,)).fetchall()
            
            return [{
                "id": row["id"],
                "timestamp": row["timestamp"],
                "event_type": row["event_type"],
                "data": json.loads(row["data"]) if row["data"] else {},
                "trade_id": row["trade_id"],
            } for row in rows]
    
    # === Reset ===
    
    def reset(self, starting_cash: float = 50.0, keep_history: bool = True):
        """
        Reset portfolio to fresh state.
        
        Args:
            starting_cash: New starting amount
            keep_history: If True, archive trades to history before clearing
        """
        with self._connect() as conn:
            if keep_history:
                # Archive pending trades
                pending = self.get_pending_trades()
                for trade in pending:
                    self._log_event("TRADE_ARCHIVED", {
                        "trade_id": trade.id,
                        "reason": "PORTFOLIO_RESET",
                        "amount": trade.amount,
                    }, trade.id)
            
            # Clear trades
            conn.execute("DELETE FROM trades")
            conn.execute("DELETE FROM portfolio_snapshots")
            conn.commit()
            
            # Set new starting cash
            self.set_starting_cash(starting_cash)
            
            # Log reset
            self._log_event("PORTFOLIO_RESET", {
                "starting_cash": starting_cash,
                "keep_history": keep_history,
            })
    
    # === Helpers ===
    
    def _now(self) -> str:
        """Get current UTC timestamp."""
        return datetime.now(timezone.utc).isoformat()
    
    def _row_to_trade(self, row: sqlite3.Row) -> Trade:
        """Convert database row to Trade object."""
        return Trade(
            id=row["id"],
            market_id=row["market_id"],
            market_question=row["market_question"],
            outcome=row["outcome"],
            side=row["side"],
            amount=row["amount"],
            price=row["price"],
            shares=row["shares"],
            status=row["status"],
            placed_at=row["placed_at"],
            resolved_at=row["resolved_at"],
            payout=row["payout"],
            profit=row["profit"],
            notes=row["notes"],
            order_id=row["order_id"],
        )


# === Convenience functions ===

def get_paper_db() -> TradingDatabase:
    """Get paper trading database."""
    return TradingDatabase(TradingMode.PAPER)

def get_live_db() -> TradingDatabase:
    """Get live trading database."""
    return TradingDatabase(TradingMode.LIVE)


# === CLI ===

if __name__ == "__main__":
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="Trading Database CLI")
    parser.add_argument("mode", choices=["paper", "live"], help="Database mode")
    parser.add_argument("action", choices=["stats", "pending", "history", "reset"],
                        help="Action to perform")
    parser.add_argument("--cash", type=float, default=50.0, help="Starting cash for reset")
    parser.add_argument("--limit", type=int, default=20, help="History limit")
    
    args = parser.parse_args()
    
    mode = TradingMode.PAPER if args.mode == "paper" else TradingMode.LIVE
    db = TradingDatabase(mode)
    
    if args.action == "stats":
        stats = db.get_portfolio_stats()
        print(f"\n📊 {mode.value.upper()} PORTFOLIO")
        print("=" * 40)
        print(f"Starting Cash:  ${stats['starting_cash']:.2f}")
        print(f"Current Cash:   ${stats['cash']:.2f}")
        print(f"Pending:        ${stats['pending_invested']:.2f}")
        print(f"Total Value:    ${stats['total_value']:.2f}")
        print(f"Realized P&L:   ${stats['realized_pnl']:+.2f}")
        print("=" * 40)
        print(f"Wins:     {stats['wins']}")
        print(f"Losses:   {stats['losses']}")
        print(f"Pending:  {stats['pending']}")
        print(f"Win Rate: {stats['win_rate']*100:.1f}%")
        
    elif args.action == "pending":
        pending = db.get_pending_trades()
        print(f"\n⏳ {len(pending)} PENDING TRADES ({mode.value})")
        for t in pending:
            print(f"  [{t.id}] {t.outcome} {t.side} @ {t.price:.2%} - ${t.amount:.2f}")
            print(f"      {t.market_question[:50]}...")
            
    elif args.action == "history":
        history = db.get_history(limit=args.limit)
        print(f"\n📜 HISTORY ({mode.value})")
        for h in history:
            print(f"  {h['timestamp'][:19]} | {h['event_type']}")
            
    elif args.action == "reset":
        confirm = input(f"Reset {mode.value} portfolio to ${args.cash}? (y/N): ")
        if confirm.lower() == 'y':
            db.reset(args.cash)
            print(f"✅ Reset complete. Starting cash: ${args.cash}")
        else:
            print("Cancelled.")
