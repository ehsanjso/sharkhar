#!/usr/bin/env python3
"""
Investor Tracker - Track Congress and Hedge Fund Trades

Usage:
    python tracker.py status     # Show cache/database status
    python tracker.py fetch      # Fetch Congress trades
    python tracker.py digest     # Generate daily digest
    python tracker.py recommend  # Generate buy/sell recommendations
    python tracker.py fund       # Fetch 13F summaries for hedge funds
"""

import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

from database import init_db, insert_congress_trade, get_recent_trades, get_recent_fund_changes
from fetchers import fetch_congress_trades_capitol, filter_notable_trades, fetch_all_13f_summaries
from config import CONGRESS_WATCHLIST


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


def show_status():
    """Show current cache and database status"""
    import sys
    import io
    
    # Force UTF-8 output
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 50)
    print("INVESTOR TRACKER - Status")
    print("=" * 50)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check congress trades cache
    cache_path = Path(__file__).parent / "congress_trades_cache.json"
    if cache_path.exists():
        try:
            with open(cache_path, 'r') as f:
                trades = json.load(f)
            mtime = datetime.fromtimestamp(cache_path.stat().st_mtime)
            age = datetime.now() - mtime
            age_str = f"{age.days}d {age.seconds // 3600}h" if age.days else f"{age.seconds // 3600}h {(age.seconds % 3600) // 60}m"
            print(f"[CACHE] Congress Trades: {len(trades)} trades")
            print(f"        Last updated: {mtime.strftime('%Y-%m-%d %H:%M')} ({age_str} ago)")
            
            # Date range
            if trades:
                dates = [t.get('disclosure_date') or t.get('transaction_date') for t in trades if t.get('disclosure_date') or t.get('transaction_date')]
                if dates:
                    dates.sort()
                    print(f"        Date range: {dates[0][:10]} to {dates[-1][:10]}")
        except Exception as e:
            print(f"[CACHE] Congress Trades: Error reading - {e}")
    else:
        print("[CACHE] Congress Trades: Not found")
    
    print()
    
    # Check processed trades
    processed_path = Path(__file__).parent / "processed_trades.json"
    if processed_path.exists():
        try:
            with open(processed_path, 'r') as f:
                processed = json.load(f)
            count = len(processed) if isinstance(processed, list) else len(processed.get('trades', []))
            print(f"[PROCESSED] Tracked entries: {count}")
        except Exception as e:
            print(f"[PROCESSED] Error reading - {e}")
    else:
        print("[PROCESSED] Not initialized")
    
    print()
    
    # Check database
    db_path = Path(__file__).parent / "trades.db"
    if db_path.exists():
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM congress_trades")
            count = cursor.fetchone()[0]
            conn.close()
            print(f"[DATABASE] Congress trades stored: {count}")
        except Exception as e:
            print(f"[DATABASE] Error - {e}")
    else:
        print("[DATABASE] Not initialized (run 'fetch' first)")
    
    print()
    print("Commands: status | fetch | digest | recommend | fund")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 0
    
    command = sys.argv[1].lower()
    
    try:
        if command == 'status':
            show_status()
            return 0
        elif command == 'fetch':
            new_count = fetch_all_data()
            return 0
        elif command == 'digest':
            digest = generate_digest()
            print()
            print(digest)
            return 0
        elif command == 'recommend':
            recs = get_recommendations()
            print("\n🎯 BUY SIGNALS:")
            for r in recs['buy'][:10]:
                print(f"  {r['ticker']}: score={r['score']} (buys={r['buys']}, watchlist={r['watchlist_buys']})")
            print("\n⚠️ SELL SIGNALS:")
            for r in recs['sell'][:10]:
                print(f"  {r['ticker']}: score={r['score']} (sells={r['sells']})")
            return 0
        elif command == 'fund':
            # Fetch 13F summaries for all watched hedge funds
            print("Fetching 13F summaries...")
            summaries = fetch_all_13f_summaries()
            print(f"\nFetched {len(summaries)} fund summaries:")
            for s in summaries:
                print(f"  • {s['fund_name']}: {s['filing_date']} ({s['form']})")
            return 0
        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            return 1
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 130
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
