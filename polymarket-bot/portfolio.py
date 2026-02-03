#!/usr/bin/env python3
"""
Polymarket Paper Trading Portfolio
Tracks simulated positions and calculates P&L.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

DATA_DIR = Path(__file__).parent / "data"
PORTFOLIO_FILE = DATA_DIR / "portfolio.json"
BETS_FILE = DATA_DIR / "bets.json"
HISTORY_FILE = DATA_DIR / "history.json"

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
        """Cash + unrealized value of pending bets."""
        return self.cash  # We'll add pending bet value separately
    
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

def ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)

def load_portfolio() -> Portfolio:
    """Load portfolio from disk or create new one."""
    ensure_data_dir()
    
    if PORTFOLIO_FILE.exists():
        with open(PORTFOLIO_FILE) as f:
            data = json.load(f)
            return Portfolio(**data)
    
    # Create new portfolio with $50
    return Portfolio(
        cash=50.0,
        starting_cash=50.0,
        created_at=datetime.now(timezone.utc).isoformat(),
        last_updated=datetime.now(timezone.utc).isoformat(),
    )

def save_portfolio(portfolio: Portfolio):
    """Save portfolio to disk."""
    ensure_data_dir()
    portfolio.last_updated = datetime.now(timezone.utc).isoformat()
    with open(PORTFOLIO_FILE, 'w') as f:
        json.dump(asdict(portfolio), f, indent=2)

def load_bets() -> list[Bet]:
    """Load all bets from disk."""
    ensure_data_dir()
    
    if not BETS_FILE.exists():
        return []
    
    with open(BETS_FILE) as f:
        data = json.load(f)
        return [Bet(**b) for b in data]

def save_bets(bets: list[Bet]):
    """Save all bets to disk."""
    ensure_data_dir()
    with open(BETS_FILE, 'w') as f:
        json.dump([asdict(b) for b in bets], f, indent=2, default=str)

def add_to_history(event: dict):
    """Append event to history log."""
    ensure_data_dir()
    
    history = []
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE) as f:
            history = json.load(f)
    
    event['timestamp'] = datetime.now(timezone.utc).isoformat()
    history.append(event)
    
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2, default=str)

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
    portfolio = load_portfolio()
    bets = load_bets()
    
    # Validate
    if amount <= 0:
        return False, "Amount must be positive"
    
    if amount > portfolio.cash:
        return False, f"Insufficient funds. Have ${portfolio.cash:.2f}, need ${amount:.2f}"
    
    if price <= 0 or price >= 1:
        return False, f"Invalid price: {price}. Must be between 0 and 1"
    
    if side not in ["YES", "NO"]:
        return False, f"Invalid side: {side}. Must be YES or NO"
    
    # Calculate shares
    shares = amount / price
    
    # Create bet
    bet_id = f"bet_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{market_id[:8]}"
    bet = Bet(
        id=bet_id,
        market_id=market_id,
        market_question=market_question,
        outcome=outcome,
        side=side,
        amount=amount,
        price=price,
        shares=shares,
        placed_at=datetime.now(timezone.utc).isoformat(),
        notes=notes,
    )
    
    # Update portfolio
    portfolio.cash -= amount
    portfolio.total_bets += 1
    portfolio.total_pending += 1
    
    # Save
    bets.append(bet)
    save_bets(bets)
    save_portfolio(portfolio)
    
    # Log to history
    add_to_history({
        "type": "BET_PLACED",
        "bet_id": bet_id,
        "market_id": market_id,
        "question": market_question[:50],
        "outcome": outcome,
        "side": side,
        "amount": amount,
        "price": price,
        "shares": shares,
    })
    
    return True, f"✅ Placed ${amount:.2f} on {outcome} {side} @ {price:.2%}. Shares: {shares:.2f}"

def resolve_bet(bet_id: str, won: bool, market_outcome: str = "") -> tuple[bool, str]:
    """
    Resolve a bet as won or lost.
    
    Returns (success, message)
    """
    portfolio = load_portfolio()
    bets = load_bets()
    
    # Find bet
    bet = None
    for b in bets:
        if b.id == bet_id:
            bet = b
            break
    
    if not bet:
        return False, f"Bet not found: {bet_id}"
    
    if bet.resolved:
        return False, f"Bet already resolved: {bet_id}"
    
    # Calculate payout
    if won:
        # Winner gets $1 per share
        payout = bet.shares
        portfolio.cash += payout
        portfolio.total_wins += 1
    else:
        payout = 0
        portfolio.total_losses += 1
    
    portfolio.total_pending -= 1
    
    # Update bet
    bet.resolved = True
    bet.won = won
    bet.payout = payout
    bet.resolved_at = datetime.now(timezone.utc).isoformat()
    
    # Save
    save_bets(bets)
    save_portfolio(portfolio)
    
    # Log to history
    profit = payout - bet.amount
    add_to_history({
        "type": "BET_RESOLVED",
        "bet_id": bet_id,
        "market_id": bet.market_id,
        "won": won,
        "amount": bet.amount,
        "payout": payout,
        "profit": profit,
        "market_outcome": market_outcome,
    })
    
    status = "WON" if won else "LOST"
    return True, f"📊 Bet {status}! Invested ${bet.amount:.2f}, payout ${payout:.2f} (P&L: ${profit:+.2f})"

def get_pending_bets() -> list[Bet]:
    """Get all unresolved bets."""
    bets = load_bets()
    return [b for b in bets if not b.resolved]

def get_portfolio_summary() -> dict:
    """Get full portfolio summary."""
    portfolio = load_portfolio()
    pending = get_pending_bets()
    
    # Calculate unrealized value (assume current price = entry price for simplicity)
    unrealized_value = sum(b.shares * b.price for b in pending)
    total_invested = sum(b.amount for b in pending)
    
    return {
        "cash": portfolio.cash,
        "starting_cash": portfolio.starting_cash,
        "total_value": portfolio.cash + unrealized_value,
        "pnl": portfolio.pnl,
        "pnl_pct": portfolio.pnl_pct,
        "total_bets": portfolio.total_bets,
        "wins": portfolio.total_wins,
        "losses": portfolio.total_losses,
        "pending": portfolio.total_pending,
        "win_rate": portfolio.win_rate,
        "pending_bets": len(pending),
        "total_invested_pending": total_invested,
        "created_at": portfolio.created_at,
        "last_updated": portfolio.last_updated,
    }

def print_portfolio():
    """Pretty print portfolio status."""
    summary = get_portfolio_summary()
    pending = get_pending_bets()
    
    pnl_emoji = "📈" if summary['pnl'] >= 0 else "📉"
    
    print(f"\n{'='*60}")
    print(f"💰 POLYMARKET PAPER TRADING PORTFOLIO")
    print(f"{'='*60}")
    print(f"  Cash:           ${summary['cash']:.2f}")
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
        print(f"\n📋 PENDING BETS ({len(pending)}):")
        for bet in pending:
            q = bet.market_question[:40] + "..." if len(bet.market_question) > 40 else bet.market_question
            print(f"  • {bet.outcome} {bet.side} @ {bet.price:.2%}")
            print(f"    {q}")
            print(f"    Amount: ${bet.amount:.2f} | Shares: {bet.shares:.2f}")
            print()

def reset_portfolio(starting_cash: float = 50.0):
    """Reset portfolio to initial state."""
    ensure_data_dir()
    
    # Archive old data
    now = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    for f in [PORTFOLIO_FILE, BETS_FILE, HISTORY_FILE]:
        if f.exists():
            archive = DATA_DIR / f"archive_{now}_{f.name}"
            f.rename(archive)
    
    # Create fresh portfolio
    portfolio = Portfolio(
        cash=starting_cash,
        starting_cash=starting_cash,
        created_at=datetime.now(timezone.utc).isoformat(),
        last_updated=datetime.now(timezone.utc).isoformat(),
    )
    save_portfolio(portfolio)
    save_bets([])
    
    print(f"Portfolio reset with ${starting_cash:.2f}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage paper trading portfolio")
    parser.add_argument("action", choices=["status", "reset", "pending"], 
                        help="Action to perform")
    parser.add_argument("--cash", type=float, default=50.0, 
                        help="Starting cash for reset")
    
    args = parser.parse_args()
    
    if args.action == "status":
        print_portfolio()
    elif args.action == "reset":
        confirm = input(f"Reset portfolio with ${args.cash}? (y/N): ")
        if confirm.lower() == 'y':
            reset_portfolio(args.cash)
        else:
            print("Cancelled")
    elif args.action == "pending":
        pending = get_pending_bets()
        if pending:
            for b in pending:
                print(f"{b.id}: {b.outcome} {b.side} @ {b.price:.2%} - ${b.amount:.2f}")
        else:
            print("No pending bets")
