#!/usr/bin/env python3
"""
Manifold Markets Paper Trading Portfolio
Tracks simulated positions and calculates P&L.
Uses "Mana" (M$) as the currency - Manifold's play money.
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
    side: str  # "YES" or "NO"
    amount: float  # Mana spent
    probability: float  # Probability at time of bet
    shares: float  # Amount / Probability = shares owned
    placed_at: str
    resolved: bool = False
    won: Optional[bool] = None
    payout: float = 0.0
    resolved_at: Optional[str] = None
    notes: str = ""

@dataclass
class Portfolio:
    mana: float
    starting_mana: float
    created_at: str
    last_updated: str
    total_bets: int = 0
    total_wins: int = 0
    total_losses: int = 0
    total_pending: int = 0
    
    @property
    def win_rate(self) -> float:
        closed = self.total_wins + self.total_losses
        return self.total_wins / closed if closed > 0 else 0
    
    @property
    def pnl(self) -> float:
        return self.mana - self.starting_mana
    
    @property
    def pnl_pct(self) -> float:
        return (self.pnl / self.starting_mana) * 100 if self.starting_mana > 0 else 0

def ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)

def load_portfolio() -> Portfolio:
    """Load portfolio from disk or create new one."""
    ensure_data_dir()
    
    if PORTFOLIO_FILE.exists():
        with open(PORTFOLIO_FILE) as f:
            data = json.load(f)
            return Portfolio(**data)
    
    # Create new portfolio with M$500 (typical Manifold starting amount)
    return Portfolio(
        mana=500.0,
        starting_mana=500.0,
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
    side: str,  # "YES" or "NO"
    amount: float,
    probability: float,
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
    
    if amount > portfolio.mana:
        return False, f"Insufficient mana. Have M${portfolio.mana:.0f}, need M${amount:.0f}"
    
    if probability <= 0 or probability >= 1:
        return False, f"Invalid probability: {probability}. Must be between 0 and 1"
    
    if side not in ["YES", "NO"]:
        return False, f"Invalid side: {side}. Must be YES or NO"
    
    # Calculate shares
    # If betting YES, shares = amount / probability
    # If betting NO, shares = amount / (1 - probability)
    effective_price = probability if side == "YES" else (1 - probability)
    shares = amount / effective_price
    
    # Create bet
    bet_id = f"mf_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{market_id[:8]}"
    bet = Bet(
        id=bet_id,
        market_id=market_id,
        market_question=market_question,
        side=side,
        amount=amount,
        probability=probability,
        shares=shares,
        placed_at=datetime.now(timezone.utc).isoformat(),
        notes=notes,
    )
    
    # Update portfolio
    portfolio.mana -= amount
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
        "side": side,
        "amount": amount,
        "probability": probability,
        "shares": shares,
    })
    
    return True, f"Placed M${amount:.0f} on {side} @ {effective_price:.1%}. Shares: {shares:.1f}"

def resolve_bet(bet_id: str, won: bool, final_resolution: str = "") -> tuple[bool, str]:
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
        # Winner gets M$1 per share
        payout = bet.shares
        portfolio.mana += payout
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
        "final_resolution": final_resolution,
    })
    
    status = "WON" if won else "LOST"
    return True, f"Bet {status}! Invested M${bet.amount:.0f}, payout M${payout:.0f} (P&L: M${profit:+.0f})"

def get_pending_bets() -> list[Bet]:
    """Get all unresolved bets."""
    bets = load_bets()
    return [b for b in bets if not b.resolved]

def get_portfolio_summary() -> dict:
    """Get full portfolio summary."""
    portfolio = load_portfolio()
    pending = get_pending_bets()
    
    # Calculate unrealized value
    total_invested = sum(b.amount for b in pending)
    
    return {
        "mana": portfolio.mana,
        "starting_mana": portfolio.starting_mana,
        "total_value": portfolio.mana + total_invested,  # Simplified
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
    
    pnl_emoji = "+" if summary['pnl'] >= 0 else ""
    
    print(f"\n{'='*60}")
    print(f"MANIFOLD PAPER TRADING PORTFOLIO")
    print(f"{'='*60}")
    print(f"  Mana:           M${summary['mana']:.0f}")
    print(f"  Total Value:    M${summary['total_value']:.0f}")
    print(f"  P&L:            M${pnl_emoji}{summary['pnl']:.0f} ({pnl_emoji}{summary['pnl_pct']:.1f}%)")
    print(f"  Starting:       M${summary['starting_mana']:.0f}")
    print(f"{'='*60}")
    print(f"  Total Bets:     {summary['total_bets']}")
    print(f"  Wins:           {summary['wins']}")
    print(f"  Losses:         {summary['losses']}")
    print(f"  Pending:        {summary['pending']}")
    print(f"  Win Rate:       {summary['win_rate']*100:.1f}%")
    print(f"{'='*60}")
    
    if pending:
        print(f"\nPENDING BETS ({len(pending)}):")
        for bet in pending:
            q = bet.market_question[:45] + "..." if len(bet.market_question) > 45 else bet.market_question
            eff_price = bet.probability if bet.side == "YES" else (1 - bet.probability)
            print(f"  * {bet.side} @ {eff_price:.1%} - M${bet.amount:.0f}")
            print(f"    {q}")
            print()

def reset_portfolio(starting_mana: float = 500.0):
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
        mana=starting_mana,
        starting_mana=starting_mana,
        created_at=datetime.now(timezone.utc).isoformat(),
        last_updated=datetime.now(timezone.utc).isoformat(),
    )
    save_portfolio(portfolio)
    save_bets([])
    
    print(f"Portfolio reset with M${starting_mana:.0f}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage Manifold paper trading portfolio")
    parser.add_argument("action", choices=["status", "reset", "pending"], 
                        help="Action to perform")
    parser.add_argument("--mana", type=float, default=500.0, 
                        help="Starting mana for reset")
    
    args = parser.parse_args()
    
    if args.action == "status":
        print_portfolio()
    elif args.action == "reset":
        confirm = input(f"Reset portfolio with M${args.mana}? (y/N): ")
        if confirm.lower() == 'y':
            reset_portfolio(args.mana)
        else:
            print("Cancelled")
    elif args.action == "pending":
        pending = get_pending_bets()
        if pending:
            for b in pending:
                print(f"{b.id}: {b.side} @ {b.probability:.1%} - M${b.amount:.0f}")
        else:
            print("No pending bets")
