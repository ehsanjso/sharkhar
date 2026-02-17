#!/usr/bin/env python3
"""
Polymarket Paper Trading Portfolio
Now backed by SQLite database for proper separation of paper/live.

This module provides backward-compatible functions that wrap the new database.
"""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

# Import the new database module
from database import TradingDatabase, TradingMode, Trade, get_paper_db

# Legacy data paths (for migration reference)
DATA_DIR = Path(__file__).parent / "data"

# Global database instance (default to paper trading)
_db: Optional[TradingDatabase] = None
_mode: TradingMode = TradingMode.PAPER


def set_trading_mode(mode: TradingMode):
    """Set trading mode (PAPER or LIVE). Call before any other functions."""
    global _db, _mode
    _mode = mode
    _db = TradingDatabase(mode)


def _get_db() -> TradingDatabase:
    """Get or create database instance."""
    global _db
    if _db is None:
        _db = TradingDatabase(_mode)
    return _db


# Legacy Bet dataclass for backward compatibility
@dataclass
class Bet:
    id: str
    market_id: str
    market_question: str
    outcome: str
    side: str  # "YES" or "NO"
    amount: float  # USD spent
    price: float  # Price paid (e.g., 0.65 = 65 cents)
    shares: float  # Amount / Price = shares owned
    placed_at: str
    resolved: bool = False
    won: Optional[bool] = None
    payout: float = 0.0
    resolved_at: Optional[str] = None
    notes: str = ""


def _trade_to_bet(trade: Trade) -> Bet:
    """Convert new Trade object to legacy Bet for compatibility."""
    return Bet(
        id=str(trade.id),
        market_id=trade.market_id,
        market_question=trade.market_question,
        outcome=trade.outcome,
        side=trade.side,
        amount=trade.amount,
        price=trade.price,
        shares=trade.shares,
        placed_at=trade.placed_at,
        resolved=trade.status != "PENDING",
        won=trade.status == "WON" if trade.status != "PENDING" else None,
        payout=trade.payout,
        resolved_at=trade.resolved_at,
        notes=trade.notes,
    )


# Legacy Portfolio class for backward compatibility
@dataclass
class Portfolio:
    cash: float
    starting_cash: float
    created_at: str
    last_updated: str
    total_bets: int = 0
    total_wins: int = 0
    total_losses: int = 0
    total_pending: int = 0
    
    @property
    def total_value(self) -> float:
        """Cash + pending investments (at cost, conservative estimate)."""
        db = _get_db()
        stats = db.get_portfolio_stats()
        return stats["total_value"]
    
    @property
    def win_rate(self) -> float:
        closed = self.total_wins + self.total_losses
        return self.total_wins / closed if closed > 0 else 0
    
    @property
    def pnl(self) -> float:
        return self.cash - self.starting_cash
    
    @property
    def pnl_pct(self) -> float:
        return (self.pnl / self.starting_cash) * 100 if self.starting_cash > 0 else 0


def load_portfolio() -> Portfolio:
    """Load portfolio from database."""
    db = _get_db()
    stats = db.get_portfolio_stats()
    
    return Portfolio(
        cash=stats["cash"],
        starting_cash=stats["starting_cash"],
        created_at=datetime.now(timezone.utc).isoformat(),  # Not tracked per-trade
        last_updated=datetime.now(timezone.utc).isoformat(),
        total_bets=stats["total_trades"],
        total_wins=stats["wins"],
        total_losses=stats["losses"],
        total_pending=stats["pending"],
    )


def save_portfolio(portfolio: Portfolio):
    """Save portfolio snapshot to database."""
    db = _get_db()
    db.save_snapshot()


def load_bets() -> list[Bet]:
    """Load all bets (trades) from database."""
    db = _get_db()
    # Get all trades, not just pending
    with db._connect() as conn:
        rows = conn.execute("SELECT * FROM trades ORDER BY placed_at").fetchall()
        trades = [db._row_to_trade(row) for row in rows]
    return [_trade_to_bet(t) for t in trades]


def save_bets(bets: list[Bet]):
    """No-op for backward compatibility. Database auto-saves."""
    pass


def add_to_history(event: dict):
    """Log event to database history."""
    db = _get_db()
    db._log_event(event.get("type", "UNKNOWN"), event)

def place_bet(
    market_id: str,
    market_question: str,
    outcome: str,
    side: str,  # "YES" or "NO"
    amount: float,
    price: float,
    notes: str = ""
) -> tuple[bool, str]:
    """
    Place a paper trade bet.
    
    Returns (success, message)
    """
    db = _get_db()
    stats = db.get_portfolio_stats()
    
    # Validate
    if amount <= 0:
        return False, "Amount must be positive"
    
    if amount > stats["cash"]:
        return False, f"Insufficient funds. Have ${stats['cash']:.2f}, need ${amount:.2f}"
    
    if price <= 0 or price >= 1:
        return False, f"Invalid price: {price}. Must be between 0 and 1"
    
    if side not in ["YES", "NO"]:
        return False, f"Invalid side: {side}. Must be YES or NO"
    
    # Calculate shares
    shares = amount / price
    
    # Create trade in database
    trade = Trade(
        id=None,  # Auto-generated
        market_id=market_id,
        market_question=market_question,
        outcome=outcome,
        side=side,
        amount=amount,
        price=price,
        shares=shares,
        status="PENDING",
        placed_at=datetime.now(timezone.utc).isoformat(),
        notes=notes,
    )
    
    trade_id = db.add_trade(trade)
    
    return True, f"✅ Placed ${amount:.2f} on {outcome} {side} @ {price:.2%}. Shares: {shares:.2f} [ID: {trade_id}]"


def resolve_bet(bet_id: str, won: bool, market_outcome: str = "") -> tuple[bool, str]:
    """
    Resolve a bet as won or lost.
    ONLY place where P&L is calculated - from ACTUAL payout.
    
    Returns (success, message)
    """
    db = _get_db()
    
    # Handle both old string IDs and new int IDs
    try:
        trade_id = int(bet_id.replace("bet_", "").split("_")[0]) if bet_id.startswith("bet_") else int(bet_id)
    except ValueError:
        # Try to find by old-style ID in notes or as exact match
        trade_id = int(bet_id) if bet_id.isdigit() else None
        if trade_id is None:
            return False, f"Invalid bet ID format: {bet_id}"
    
    trade = db.get_trade(trade_id)
    if not trade:
        return False, f"Bet not found: {bet_id}"
    
    if trade.status != "PENDING":
        return False, f"Bet already resolved: {bet_id} ({trade.status})"
    
    # Calculate payout from ACTUAL result
    # Winner gets $1 per share, loser gets $0
    if won:
        payout = trade.shares  # $1 per share
    else:
        payout = 0.0
    
    # Resolve in database (this calculates profit = payout - amount)
    resolved_trade = db.resolve_trade(trade_id, won=won, payout=payout)
    
    status = "WON" if won else "LOST"
    return True, f"📊 Bet {status}! Invested ${trade.amount:.2f}, payout ${payout:.2f} (P&L: ${resolved_trade.profit:+.2f})"

def get_pending_bets() -> list[Bet]:
    """Get all unresolved bets."""
    db = _get_db()
    trades = db.get_pending_trades()
    return [_trade_to_bet(t) for t in trades]


def get_portfolio_summary() -> dict:
    """
    Get full portfolio summary.
    All values from database - single source of truth.
    """
    db = _get_db()
    stats = db.get_portfolio_stats()
    
    return {
        "mode": stats["mode"],
        "cash": stats["cash"],
        "starting_cash": stats["starting_cash"],
        "total_value": stats["total_value"],
        "pnl": stats["realized_pnl"],
        "pnl_pct": (stats["realized_pnl"] / stats["starting_cash"] * 100) 
                   if stats["starting_cash"] > 0 else 0,
        "total_bets": stats["total_trades"],
        "wins": stats["wins"],
        "losses": stats["losses"],
        "pending": stats["pending"],
        "win_rate": stats["win_rate"],
        "pending_bets": stats["pending"],
        "total_invested_pending": stats["pending_invested"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


def print_portfolio():
    """Pretty print portfolio status."""
    summary = get_portfolio_summary()
    pending = get_pending_bets()
    
    pnl_emoji = "📈" if summary['pnl'] >= 0 else "📉"
    mode_label = summary.get('mode', 'paper').upper()
    
    print(f"\n{'='*60}")
    print(f"💼 POLYMARKET {mode_label} TRADING PORTFOLIO")
    print(f"{'='*60}")
    print(f"  Cash:           ${summary['cash']:.2f}")
    print(f"  Pending:        ${summary['total_invested_pending']:.2f}")
    print(f"  Total Value:    ${summary['total_value']:.2f}")
    print(f"  {pnl_emoji} P&L:           ${summary['pnl']:+.2f} ({summary['pnl_pct']:+.1f}%)")
    print(f"  Starting:       ${summary['starting_cash']:.2f}")
    print(f"{'='*60}")
    print(f"  Total Bets:     {summary['total_bets']}")
    print(f"  Wins:           {summary['wins']} ✅")
    print(f"  Losses:         {summary['losses']} ❌")
    print(f"  Pending:        {summary['pending']} ⏳")
    print(f"  Win Rate:       {summary['win_rate']*100:.1f}%")
    print(f"{'='*60}")
    
    if pending:
        print(f"\n⏳ PENDING BETS ({len(pending)}):")
        for bet in pending:
            q = bet.market_question[:40] + "..." if len(bet.market_question) > 40 else bet.market_question
            print(f"  [{bet.id}] {bet.outcome} {bet.side} @ {bet.price:.2%}")
            print(f"      {q}")
            print(f"      Amount: ${bet.amount:.2f} | Shares: {bet.shares:.2f}")
            print()


def reset_portfolio(starting_cash: float = 50.0, preserve_pending: bool = False):
    """Reset portfolio to initial state.
    
    Args:
        starting_cash: New starting cash amount
        preserve_pending: If True, keep unresolved bets (NOT RECOMMENDED for clean reset)
    """
    db = _get_db()
    
    if preserve_pending:
        print("⚠️  Warning: preserve_pending is deprecated. Pending bets will be archived to history.")
    
    # Reset database (archives to history)
    db.reset(starting_cash, keep_history=True)
    
    print(f"✅ Portfolio reset with ${starting_cash:.2f}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage trading portfolio")
    parser.add_argument("action", choices=["status", "reset", "pending"], 
                        help="Action to perform")
    parser.add_argument("--mode", choices=["paper", "live"], default="paper",
                        help="Trading mode (default: paper)")
    parser.add_argument("--cash", type=float, default=50.0, 
                        help="Starting cash for reset")
    
    args = parser.parse_args()
    
    # Set trading mode
    mode = TradingMode.PAPER if args.mode == "paper" else TradingMode.LIVE
    set_trading_mode(mode)
    
    if args.action == "status":
        print_portfolio()
    elif args.action == "reset":
        confirm = input(f"Reset {args.mode.upper()} portfolio with ${args.cash}? (y/N): ")
        if confirm.lower() == 'y':
            reset_portfolio(args.cash)
        else:
            print("Cancelled")
    elif args.action == "pending":
        pending = get_pending_bets()
        if pending:
            for b in pending:
                print(f"[{b.id}] {b.outcome} {b.side} @ {b.price:.2%} - ${b.amount:.2f}")
        else:
            print("No pending bets")
