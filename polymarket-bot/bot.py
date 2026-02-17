#!/usr/bin/env python3
"""
Polymarket Paper Trading Bot
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
    print("🔍 Scanning Polymarket for opportunities...")
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
    bankroll = summary['cash']
    
    print(f"💰 Current bankroll: ${bankroll:.2f}")
    print(f"🔍 Generating signals...")
    
    signals = generate_signals(bankroll, max_bet_pct=args.max_bet)
    
    if args.json:
        print(json.dumps([{
            "market_id": s.market_id,
            "question": s.question,
            "outcome": s.outcome,
            "side": s.side,
            "price": s.price,
            "confidence": s.confidence,
            "edge": s.edge,
            "reason": s.reason,
            "suggested_amount": s.suggested_amount,
            "url": s.url,
        } for s in signals], indent=2))
    else:
        print_signals(signals)
        
        if signals and not args.dry_run:
            print("\n💡 To place a bet, use: polybot bet <market_id> <outcome> <side> <amount> <price>")

def run_bet(args):
    """Place a paper trade bet."""
    success, message = place_bet(
        market_id=args.market_id,
        market_question=args.question or "Unknown",
        outcome=args.outcome,
        side=args.side.upper(),
        amount=args.amount,
        price=args.price,
        notes=args.notes or "",
    )
    
    print(message)
    
    if success:
        print_portfolio()

def run_status(args):
    """Show portfolio status."""
    print_portfolio()
    
    if args.verbose:
        pending = get_pending_bets()
        if pending:
            print("\n📋 DETAILED PENDING BETS:")
            for bet in pending:
                print(f"\n  Bet ID: {bet.id}")
                print(f"  Market: {bet.market_id}")
                print(f"  Question: {bet.market_question}")
                print(f"  Position: {bet.outcome} {bet.side} @ {bet.price:.2%}")
                print(f"  Amount: ${bet.amount:.2f} | Shares: {bet.shares:.2f}")
                print(f"  Placed: {bet.placed_at}")
                if bet.notes:
                    print(f"  Notes: {bet.notes}")

def run_resolve(args):
    """Check and resolve pending bets."""
    results = check_and_resolve_pending_bets()
    summary = get_resolution_summary(results)
    
    print(f"\n{summary}")
    print_portfolio()

def run_reset(args):
    """Reset portfolio."""
    preserve = not getattr(args, 'clear_pending', False)
    
    if not args.force:
        pending = get_pending_bets()
        msg = f"Reset portfolio to ${args.cash:.2f}?"
        if pending and preserve:
            msg += f" ({len(pending)} pending bets will be preserved)"
        elif pending and not preserve:
            msg += f" ({len(pending)} pending bets will be CLEARED)"
        msg += " (y/N): "
        
        confirm = input(msg)
        if confirm.lower() != 'y':
            print("Cancelled.")
            return
    
    reset_portfolio(args.cash, preserve_pending=preserve)
    print_portfolio()

def run_auto(args):
    """
    Auto mode: Check resolutions, generate signals, optionally place bets.
    Designed to be run on a schedule.
    """
    print(f"\n{'='*60}")
    print(f"🤖 POLYMARKET BOT - AUTO RUN")
    print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'='*60}")
    
    # Step 1: Check resolutions
    print("\n📊 Step 1: Checking pending bet resolutions...")
    results = check_and_resolve_pending_bets()
    if results:
        print(f"   {get_resolution_summary(results)}")
    else:
        print("   No bets resolved.")
    
    # Step 2: Get current status
    summary = get_portfolio_summary()
    print(f"\n💰 Step 2: Portfolio Status")
    print(f"   Cash: ${summary['cash']:.2f}")
    print(f"   Total Value: ${summary['total_value']:.2f}")
    print(f"   P&L: ${summary['pnl']:+.2f} ({summary['pnl_pct']:+.1f}%)")
    print(f"   Record: {summary['wins']}W / {summary['losses']}L / {summary['pending']}P")
    
    # Step 3: Generate signals
    print(f"\n🎯 Step 3: Generating signals...")
    signals = generate_signals(summary['cash'], max_bet_pct=args.max_bet)
    
    if not signals:
        print("   No signals found.")
    else:
        print(f"   Found {len(signals)} signals:")
        for s in signals[:5]:  # Show top 5
            q = s.question[:40] + "..." if len(s.question) > 40 else s.question
            print(f"   • {s.outcome} {s.side} @ {s.price:.0%} - ${s.suggested_amount:.2f}")
            print(f"     {q}")
    
    # Step 4: Place bets (if auto-bet enabled)
    placed = 0
    if args.auto_bet and signals:
        print(f"\n🎰 Step 4: Auto-placing bets...")
        
        # Limit concurrent bets
        max_new_bets = max(0, args.max_concurrent - summary['pending'])
        
        if max_new_bets == 0:
            print(f"   Already at max concurrent bets ({args.max_concurrent}). Skipping.")
        else:
            placed = 0
            for signal in signals[:max_new_bets]:
                success, msg = place_bet(
                    market_id=signal.market_id,
                    market_question=signal.question,
                    outcome=signal.outcome,
                    side=signal.side,
                    amount=signal.suggested_amount,
                    price=signal.price,
                    notes=f"Auto: {signal.reason}",
                )
                print(f"   {msg}")
                if success:
                    placed += 1
            
            print(f"   Placed {placed} new bets.")
    elif args.auto_bet:
        print(f"\n🎰 Step 4: No bets to place.")
    else:
        print(f"\n💡 Step 4: Auto-bet disabled. Use --auto-bet to enable.")
    
    # Final summary
    final_summary = get_portfolio_summary()
    print(f"\n{'='*60}")
    print(f"📈 FINAL STATUS: ${final_summary['total_value']:.2f} ({final_summary['pnl']:+.2f})")
    print(f"{'='*60}\n")
    
    # Log run to history
    add_to_history({
        "type": "AUTO_RUN",
        "resolutions": len(results),
        "signals": len(signals),
        "bets_placed": placed if args.auto_bet else 0,
        "cash": final_summary['cash'],
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
    
    # Calculate days running
    from datetime import datetime
    created = datetime.fromisoformat(summary['created_at'].replace('Z', '+00:00'))
    days_running = (datetime.now(timezone.utc) - created).days
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║         POLYMARKET PAPER TRADING REPORT                      ║
╠══════════════════════════════════════════════════════════════╣
║  Started:        {summary['created_at'][:10]}                           ║
║  Days Running:   {days_running:3d}                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Starting Cash:  ${summary['starting_cash']:>10.2f}                         ║
║  Current Cash:   ${summary['cash']:>10.2f}                         ║
║  Total Value:    ${summary['total_value']:>10.2f}                         ║
║  P&L:            ${summary['pnl']:>+10.2f} ({summary['pnl_pct']:+.1f}%)                   ║
╠══════════════════════════════════════════════════════════════╣
║  Total Bets:     {summary['total_bets']:>3d}                                        ║
║  Wins:           {summary['wins']:>3d} ✅                                      ║
║  Losses:         {summary['losses']:>3d} ❌                                      ║
║  Pending:        {summary['pending']:>3d} ⏳                                      ║
║  Win Rate:       {summary['win_rate']*100:>5.1f}%                                    ║
╠══════════════════════════════════════════════════════════════╣"""

    if pending:
        report += "\n║  PENDING POSITIONS:                                          ║\n"
        for bet in pending[:5]:
            q = bet.market_question[:35] + "..." if len(bet.market_question) > 35 else bet.market_question
            report += f"║  • ${bet.amount:.2f} on {bet.outcome} {bet.side} @ {bet.price:.0%}                    ║\n"
    
    report += """╚══════════════════════════════════════════════════════════════╝"""
    
    print(report)

def main():
    parser = argparse.ArgumentParser(
        description="Polymarket Paper Trading Bot",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  polybot status                     # Show portfolio
  polybot scan --sort edge           # Find opportunities
  polybot signals                    # Get trading signals
  polybot bet <id> Yes YES 5.00 0.85 # Place a bet
  polybot resolve                    # Check bet outcomes
  polybot auto --auto-bet            # Full auto run with betting
  polybot report                     # Performance report
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # Scan command
    scan_parser = subparsers.add_parser('scan', help='Scan markets')
    scan_parser.add_argument('--limit', type=int, default=15)
    scan_parser.add_argument('--sort', choices=['ending_soon', 'volume', 'edge'], default='ending_soon')
    scan_parser.add_argument('--max-days', type=int, default=14)
    scan_parser.add_argument('--min-volume', type=float, default=5000)
    scan_parser.add_argument('--json', action='store_true')
    scan_parser.set_defaults(func=run_scan)
    
    # Signals command
    signals_parser = subparsers.add_parser('signals', help='Generate trading signals')
    signals_parser.add_argument('--max-bet', type=float, default=0.15, help='Max bet as fraction')
    signals_parser.add_argument('--json', action='store_true')
    signals_parser.add_argument('--dry-run', action='store_true')
    signals_parser.set_defaults(func=run_signals)
    
    # Bet command
    bet_parser = subparsers.add_parser('bet', help='Place a paper trade')
    bet_parser.add_argument('market_id', help='Market ID')
    bet_parser.add_argument('outcome', help='Outcome to bet on (e.g., Yes, No, Team A)')
    bet_parser.add_argument('side', choices=['YES', 'NO', 'yes', 'no'], help='YES or NO')
    bet_parser.add_argument('amount', type=float, help='Amount to bet in USD')
    bet_parser.add_argument('price', type=float, help='Price (0-1)')
    bet_parser.add_argument('--question', type=str, help='Market question (optional)')
    bet_parser.add_argument('--notes', type=str, help='Notes')
    bet_parser.set_defaults(func=run_bet)
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show portfolio status')
    status_parser.add_argument('-v', '--verbose', action='store_true')
    status_parser.set_defaults(func=run_status)
    
    # Resolve command
    resolve_parser = subparsers.add_parser('resolve', help='Check and resolve bets')
    resolve_parser.set_defaults(func=run_resolve)
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset portfolio')
    reset_parser.add_argument('--cash', type=float, default=50.0)
    reset_parser.add_argument('--force', action='store_true')
    reset_parser.add_argument('--clear-pending', action='store_true', dest='clear_pending',
                              help='Also clear pending bets (default: preserve them)')
    reset_parser.set_defaults(func=run_reset)
    
    # Auto command
    auto_parser = subparsers.add_parser('auto', help='Automatic run (resolve + signals + bet)')
    auto_parser.add_argument('--auto-bet', action='store_true', help='Automatically place bets')
    auto_parser.add_argument('--max-bet', type=float, default=0.15)
    auto_parser.add_argument('--max-concurrent', type=int, default=5, help='Max pending bets')
    auto_parser.set_defaults(func=run_auto)
    
    # Report command
    report_parser = subparsers.add_parser('report', help='Generate performance report')
    report_parser.set_defaults(func=run_report)
    
    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
