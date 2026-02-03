#!/usr/bin/env python3
"""
Manifold Markets Paper Trading Bot
Main entry point for running the simulation.
"""

import argparse
import json
from datetime import datetime, timezone

from portfolio import (
    load_portfolio, save_portfolio, place_bet, get_portfolio_summary,
    print_portfolio, reset_portfolio, get_pending_bets, add_to_history
)
from strategy import generate_signals, print_signals
from resolver import check_and_resolve_pending_bets, get_resolution_summary
from scanner import scan_markets, print_opportunities

def run_scan(args):
    """Scan markets for opportunities."""
    print("Scanning Manifold Markets...")
    opportunities = scan_markets(
        limit=args.limit,
        sort_by=args.sort,
        max_days=args.max_days,
        min_volume=args.min_volume
    )
    
    if args.json:
        print(json.dumps(opportunities, indent=2, default=str))
    else:
        print_opportunities(opportunities)

def run_signals(args):
    """Generate trading signals."""
    summary = get_portfolio_summary()
    bankroll = summary['mana']
    
    print(f"Current bankroll: M${bankroll:.0f}")
    print(f"Generating signals...")
    
    signals = generate_signals(bankroll, max_bet_pct=args.max_bet)
    
    if args.json:
        print(json.dumps([{
            "market_id": s.market_id,
            "question": s.question,
            "side": s.side,
            "probability": s.probability,
            "confidence": s.confidence,
            "edge": s.edge,
            "reason": s.reason,
            "suggested_amount": s.suggested_amount,
            "url": s.url,
        } for s in signals], indent=2))
    else:
        print_signals(signals)

def run_bet(args):
    """Place a paper trade bet."""
    success, message = place_bet(
        market_id=args.market_id,
        market_question=args.question or "Unknown",
        side=args.side.upper(),
        amount=args.amount,
        probability=args.probability,
        notes=args.notes or "",
    )
    
    print(message)
    
    if success:
        print_portfolio()

def run_status(args):
    """Show portfolio status."""
    print_portfolio()

def run_resolve(args):
    """Check and resolve pending bets."""
    results = check_and_resolve_pending_bets()
    summary = get_resolution_summary(results)
    
    print(f"\n{summary}")
    print_portfolio()

def run_reset(args):
    """Reset portfolio."""
    if not args.force:
        confirm = input(f"Reset portfolio to M${args.mana:.0f}? (y/N): ")
        if confirm.lower() != 'y':
            print("Cancelled.")
            return
    
    reset_portfolio(args.mana)
    print_portfolio()

def run_auto(args):
    """
    Auto mode: Check resolutions, generate signals, optionally place bets.
    """
    print(f"\n{'='*60}")
    print(f"MANIFOLD BOT - AUTO RUN")
    print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'='*60}")
    
    # Step 1: Check resolutions
    print("\nStep 1: Checking pending bet resolutions...")
    results = check_and_resolve_pending_bets()
    if results:
        print(f"   {get_resolution_summary(results)}")
    else:
        print("   No bets resolved.")
    
    # Step 2: Get current status
    summary = get_portfolio_summary()
    print(f"\nStep 2: Portfolio Status")
    print(f"   Mana: M${summary['mana']:.0f}")
    print(f"   Total Value: M${summary['total_value']:.0f}")
    pnl_sign = "+" if summary['pnl'] >= 0 else ""
    print(f"   P&L: M${pnl_sign}{summary['pnl']:.0f} ({pnl_sign}{summary['pnl_pct']:.1f}%)")
    print(f"   Record: {summary['wins']}W / {summary['losses']}L / {summary['pending']}P")
    
    # Step 3: Generate signals
    print(f"\nStep 3: Generating signals...")
    signals = generate_signals(summary['mana'], max_bet_pct=args.max_bet)
    
    placed = 0
    if not signals:
        print("   No signals found.")
    else:
        print(f"   Found {len(signals)} signals:")
        for s in signals[:5]:
            q = s.question[:40] + "..." if len(s.question) > 40 else s.question
            eff = s.probability if s.side == "YES" else (1 - s.probability)
            print(f"   * {s.side} @ {eff:.0%} - M${s.suggested_amount:.0f}")
            print(f"     {q}")
    
    # Step 4: Place bets (if auto-bet enabled)
    if args.auto_bet and signals:
        print(f"\nStep 4: Auto-placing bets...")
        
        max_new_bets = max(0, args.max_concurrent - summary['pending'])
        
        if max_new_bets == 0:
            print(f"   Already at max concurrent bets ({args.max_concurrent}). Skipping.")
        else:
            for signal in signals[:max_new_bets]:
                success, msg = place_bet(
                    market_id=signal.market_id,
                    market_question=signal.question,
                    side=signal.side,
                    amount=signal.suggested_amount,
                    probability=signal.probability,
                    notes=f"Auto: {signal.reason}",
                )
                print(f"   {msg}")
                if success:
                    placed += 1
            
            print(f"   Placed {placed} new bets.")
    elif args.auto_bet:
        print(f"\nStep 4: No bets to place.")
    else:
        print(f"\nStep 4: Auto-bet disabled. Use --auto-bet to enable.")
    
    # Final summary
    final_summary = get_portfolio_summary()
    print(f"\n{'='*60}")
    pnl_sign = "+" if final_summary['pnl'] >= 0 else ""
    print(f"FINAL STATUS: M${final_summary['total_value']:.0f} (M${pnl_sign}{final_summary['pnl']:.0f})")
    print(f"{'='*60}\n")
    
    # Log run
    add_to_history({
        "type": "AUTO_RUN",
        "resolutions": len(results),
        "signals": len(signals),
        "bets_placed": placed,
        "mana": final_summary['mana'],
        "total_value": final_summary['total_value'],
        "pnl": final_summary['pnl'],
    })
    
    return {
        "resolutions": results,
        "signals": signals,
        "summary": final_summary,
    }

def run_report(args):
    """Generate performance report."""
    summary = get_portfolio_summary()
    pending = get_pending_bets()
    
    from datetime import datetime
    created = datetime.fromisoformat(summary['created_at'].replace('Z', '+00:00'))
    days_running = (datetime.now(timezone.utc) - created).days
    
    pnl_sign = "+" if summary['pnl'] >= 0 else ""
    
    print(f"""
{'='*60}
         MANIFOLD PAPER TRADING REPORT
{'='*60}
  Started:        {summary['created_at'][:10]}
  Days Running:   {days_running}
{'='*60}
  Starting Mana:  M${summary['starting_mana']:.0f}
  Current Mana:   M${summary['mana']:.0f}
  Total Value:    M${summary['total_value']:.0f}
  P&L:            M${pnl_sign}{summary['pnl']:.0f} ({pnl_sign}{summary['pnl_pct']:.1f}%)
{'='*60}
  Total Bets:     {summary['total_bets']}
  Wins:           {summary['wins']}
  Losses:         {summary['losses']}
  Pending:        {summary['pending']}
  Win Rate:       {summary['win_rate']*100:.1f}%
{'='*60}""")

    if pending:
        print("  PENDING POSITIONS:")
        for bet in pending[:5]:
            eff = bet.probability if bet.side == "YES" else (1 - bet.probability)
            print(f"  * M${bet.amount:.0f} on {bet.side} @ {eff:.0%}")
    
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(
        description="Manifold Markets Paper Trading Bot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  mfbot status                       # Show portfolio
  mfbot scan --sort volume           # Find opportunities
  mfbot signals                      # Get trading signals
  mfbot bet <id> YES 50 0.75         # Place a bet
  mfbot resolve                      # Check bet outcomes
  mfbot auto --auto-bet              # Full auto run with betting
  mfbot report                       # Performance report
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # Scan command
    scan_parser = subparsers.add_parser('scan', help='Scan markets')
    scan_parser.add_argument('--limit', type=int, default=15)
    scan_parser.add_argument('--sort', choices=['volume', 'liquidity', 'edge', 'closing_soon'], default='volume')
    scan_parser.add_argument('--max-days', type=int, default=60)
    scan_parser.add_argument('--min-volume', type=float, default=1000)
    scan_parser.add_argument('--json', action='store_true')
    scan_parser.set_defaults(func=run_scan)
    
    # Signals command
    signals_parser = subparsers.add_parser('signals', help='Generate trading signals')
    signals_parser.add_argument('--max-bet', type=float, default=0.10)
    signals_parser.add_argument('--json', action='store_true')
    signals_parser.set_defaults(func=run_signals)
    
    # Bet command
    bet_parser = subparsers.add_parser('bet', help='Place a paper trade')
    bet_parser.add_argument('market_id', help='Market ID')
    bet_parser.add_argument('side', choices=['YES', 'NO', 'yes', 'no'])
    bet_parser.add_argument('amount', type=float, help='Amount in mana')
    bet_parser.add_argument('probability', type=float, help='Current probability (0-1)')
    bet_parser.add_argument('--question', type=str)
    bet_parser.add_argument('--notes', type=str)
    bet_parser.set_defaults(func=run_bet)
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show portfolio status')
    status_parser.set_defaults(func=run_status)
    
    # Resolve command
    resolve_parser = subparsers.add_parser('resolve', help='Check and resolve bets')
    resolve_parser.set_defaults(func=run_resolve)
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset portfolio')
    reset_parser.add_argument('--mana', type=float, default=500.0)
    reset_parser.add_argument('--force', action='store_true')
    reset_parser.set_defaults(func=run_reset)
    
    # Auto command
    auto_parser = subparsers.add_parser('auto', help='Automatic run')
    auto_parser.add_argument('--auto-bet', action='store_true')
    auto_parser.add_argument('--max-bet', type=float, default=0.10)
    auto_parser.add_argument('--max-concurrent', type=int, default=5)
    auto_parser.set_defaults(func=run_auto)
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Performance report')
    report_parser.set_defaults(func=run_report)
    
    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
