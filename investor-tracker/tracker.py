#!/usr/bin/env python3
"""
Investor Tracker - Track Congress and Hedge Fund Trades

Usage:
    python tracker.py fetch      # Fetch latest data
    python tracker.py digest     # Generate daily digest
    python tracker.py backtest   # Run backtests (TODO)
"""

import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

from database import init_db, insert_congress_trade, get_recent_trades, get_recent_fund_changes
from fetchers import fetch_congress_trades_capitol, filter_notable_trades, fetch_13f_filings
from config import CONGRESS_WATCHLIST, HEDGE_FUND_WATCHLIST


def fetch_all_data():
    """Fetch all data from sources"""
    print("=" * 50)
    print("INVESTOR TRACKER - Data Fetch")
    print("=" * 50)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Initialize database
    init_db()
    
    # Fetch Congress trades
    print("📊 Fetching Congress trades...")
    trades = fetch_congress_trades_capitol()
    print(f"   Found {len(trades)} total trades")
    
    new_count = 0
    for trade in trades:
        if insert_congress_trade(trade):
            new_count += 1
    print(f"   Inserted {new_count} new trades")
    
    # Fetch 13F filings (rate limited, be careful)
    print()
    print("🏦 Fetching 13F filings...")
    print("   (Skipping bulk fetch to avoid rate limits)")
    print("   Use 'python tracker.py fetch-fund <fund_name>' for specific fund")
    
    print()
    print("✅ Data fetch complete!")
    return new_count


def generate_digest(days: int = 7) -> str:
    """Generate a digest of notable trades"""
    print("=" * 50)
    print("INVESTOR TRACKER - Daily Digest")
    print("=" * 50)
    
    # Fetch fresh data first
    trades = fetch_congress_trades_capitol()
    notable = filter_notable_trades(trades, days=days)
    
    # Separate buys and sells
    buys = [t for t in notable if 'purchase' in t.get('transaction_type', '').lower()]
    sells = [t for t in notable if 'sale' in t.get('transaction_type', '').lower()]
    
    # Build digest
    lines = []
    lines.append(f"📈 **Investor Tracker Daily Digest**")
    lines.append(f"_{datetime.now().strftime('%B %d, %Y')}_")
    lines.append("")
    
    # Watchlist trades (high priority)
    watchlist_buys = [t for t in buys if t.get('is_watchlist')]
    watchlist_sells = [t for t in sells if t.get('is_watchlist')]
    
    if watchlist_buys or watchlist_sells:
        lines.append("🔥 **WATCHLIST ALERTS**")
        lines.append("")
        
        if watchlist_buys:
            lines.append("🟢 **Buys:**")
            for t in watchlist_buys[:10]:
                amount = f"${t['amount_low']:,}-${t['amount_high']:,}" if t['amount_high'] else "N/A"
                lines.append(f"• **{t['ticker']}** — {t['politician']} ({t['party']}) — {amount}")
            lines.append("")
        
        if watchlist_sells:
            lines.append("🔴 **Sells:**")
            for t in watchlist_sells[:10]:
                amount = f"${t['amount_low']:,}-${t['amount_high']:,}" if t['amount_high'] else "N/A"
                lines.append(f"• **{t['ticker']}** — {t['politician']} ({t['party']}) — {amount}")
            lines.append("")
    
    # Top buys across all Congress
    lines.append("📊 **Top Congress Buys (Last 7 Days)**")
    for t in buys[:15]:
        star = "⭐" if t.get('is_watchlist') else ""
        amount = f"${t['amount_low']:,}-${t['amount_high']:,}" if t['amount_high'] else "N/A"
        lines.append(f"• {star}**{t['ticker']}** — {t['politician'][:20]} — {amount}")
    lines.append("")
    
    # Top sells
    lines.append("📉 **Top Congress Sells (Last 7 Days)**")
    for t in sells[:15]:
        star = "⭐" if t.get('is_watchlist') else ""
        amount = f"${t['amount_low']:,}-${t['amount_high']:,}" if t['amount_high'] else "N/A"
        lines.append(f"• {star}**{t['ticker']}** — {t['politician'][:20]} — {amount}")
    lines.append("")
    
    # Ticker frequency analysis
    ticker_counts = {}
    for t in buys:
        ticker = t.get('ticker', '')
        if ticker:
            ticker_counts[ticker] = ticker_counts.get(ticker, 0) + 1
    
    if ticker_counts:
        lines.append("🎯 **Most Bought Tickers (by # of Congress members)**")
        sorted_tickers = sorted(ticker_counts.items(), key=lambda x: -x[1])
        for ticker, count in sorted_tickers[:10]:
            if count >= 2:
                lines.append(f"• **{ticker}** — {count} members buying")
        lines.append("")
    
    # Summary stats
    lines.append("📈 **Summary**")
    lines.append(f"• Total notable trades: {len(notable)}")
    lines.append(f"• Buys: {len(buys)} | Sells: {len(sells)}")
    lines.append(f"• Watchlist alerts: {len(watchlist_buys) + len(watchlist_sells)}")
    
    digest = "\n".join(lines)
    
    # Save to file
    digest_path = Path(__file__).parent / "latest_digest.md"
    digest_path.write_text(digest, encoding='utf-8')
    print(f"Digest saved to {digest_path}")
    
    return digest


def get_recommendations() -> dict:
    """Generate buy/sell recommendations based on patterns"""
    trades = fetch_congress_trades_capitol()
    notable = filter_notable_trades(trades, days=14)
    
    buys = [t for t in notable if 'purchase' in t.get('transaction_type', '').lower()]
    sells = [t for t in notable if 'sale' in t.get('transaction_type', '').lower()]
    
    # Score tickers by buy/sell ratio and watchlist involvement
    ticker_scores = {}
    
    for t in buys:
        ticker = t.get('ticker', '')
        if not ticker:
            continue
        if ticker not in ticker_scores:
            ticker_scores[ticker] = {'buys': 0, 'sells': 0, 'watchlist_buys': 0, 'total_value': 0}
        ticker_scores[ticker]['buys'] += 1
        ticker_scores[ticker]['total_value'] += t.get('amount_high', 0) or 0
        if t.get('is_watchlist'):
            ticker_scores[ticker]['watchlist_buys'] += 1
    
    for t in sells:
        ticker = t.get('ticker', '')
        if not ticker:
            continue
        if ticker not in ticker_scores:
            ticker_scores[ticker] = {'buys': 0, 'sells': 0, 'watchlist_buys': 0, 'total_value': 0}
        ticker_scores[ticker]['sells'] += 1
    
    # Calculate recommendation scores
    recommendations = {'buy': [], 'sell': [], 'hold': []}
    
    for ticker, data in ticker_scores.items():
        score = data['buys'] - data['sells']
        score += data['watchlist_buys'] * 2  # Watchlist buys count extra
        
        rec = {
            'ticker': ticker,
            'score': score,
            'buys': data['buys'],
            'sells': data['sells'],
            'watchlist_buys': data['watchlist_buys'],
            'total_value': data['total_value'],
        }
        
        if score >= 2:
            recommendations['buy'].append(rec)
        elif score <= -2:
            recommendations['sell'].append(rec)
        else:
            recommendations['hold'].append(rec)
    
    # Sort by score
    recommendations['buy'].sort(key=lambda x: -x['score'])
    recommendations['sell'].sort(key=lambda x: x['score'])
    
    return recommendations


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1].lower()
    
    if command == 'fetch':
        fetch_all_data()
    elif command == 'digest':
        digest = generate_digest()
        print()
        print(digest)
    elif command == 'recommend':
        recs = get_recommendations()
        print("\n🎯 BUY SIGNALS:")
        for r in recs['buy'][:10]:
            print(f"  {r['ticker']}: score={r['score']} (buys={r['buys']}, watchlist={r['watchlist_buys']})")
        print("\n⚠️ SELL SIGNALS:")
        for r in recs['sell'][:10]:
            print(f"  {r['ticker']}: score={r['score']} (sells={r['sells']})")
    else:
        print(f"Unknown command: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
