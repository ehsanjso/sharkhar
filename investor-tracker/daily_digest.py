#!/usr/bin/env python3
"""
Daily Investor Digest Generator
Fetches and formats notable trades for Telegram delivery

Usage:
    python daily_digest.py          # Generate and print digest
    python daily_digest.py --send   # Generate and send to Telegram
"""

import json
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

# Congress members to highlight
WATCHLIST = [
    "Nancy Pelosi", "Tommy Tuberville", "Dan Crenshaw", 
    "Marjorie Taylor Greene", "Josh Gottheimer", "Michael McCaul",
]

# Major hedge funds (CIK numbers for SEC lookup)
HEDGE_FUNDS = {
    "Berkshire Hathaway": "1067983",
    "Pershing Square": "1336528",
    "Bridgewater": "1350694",
    "Citadel": "1423053",
    "Soros Fund": "1029160",
}

def fetch_sec_13f_dates():
    """Fetch latest 13F filing dates for watched funds"""
    filings = []
    
    for fund_name, cik in HEDGE_FUNDS.items():
        try:
            url = f"https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json"
            req = urllib.request.Request(url, headers={
                'User-Agent': 'InvestorTracker ehsan@example.com',
                'Accept': 'application/json'
            })
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
            
            forms = data.get('filings', {}).get('recent', {}).get('form', [])
            dates = data.get('filings', {}).get('recent', {}).get('filingDate', [])
            
            for i, form in enumerate(forms[:30]):
                if form in ['13F-HR', '13F-HR/A']:
                    filings.append({
                        'fund': fund_name,
                        'date': dates[i],
                        'form': form
                    })
                    break
            
            import time
            time.sleep(0.5)  # Rate limit
            
        except Exception as e:
            print(f"Error fetching {fund_name}: {e}")
    
    return filings


def load_congress_cache():
    """Load congress trades from local cache"""
    cache_path = Path(__file__).parent / "congress_trades_cache.json"
    if cache_path.exists():
        with open(cache_path, 'r') as f:
            return json.load(f)
    return []


def generate_digest():
    """Generate the daily digest"""
    lines = []
    today = datetime.now()
    
    lines.append(f"**Investor Tracker - {today.strftime('%B %d, %Y')}**")
    lines.append("")
    
    # 13F Filings Section
    lines.append("**Latest 13F Filings (Hedge Funds)**")
    filings = fetch_sec_13f_dates()
    
    if filings:
        for f in filings[:8]:
            days_ago = (today - datetime.strptime(f['date'], '%Y-%m-%d')).days
            fresh = " NEW" if days_ago <= 7 else ""
            lines.append(f"- {f['fund']}: {f['date']}{fresh}")
    else:
        lines.append("- Unable to fetch (rate limited)")
    lines.append("")
    
    # Congress trades (from cache)
    congress = load_congress_cache()
    if congress:
        # Filter recent trades (last 14 days)
        cutoff = (today - timedelta(days=14)).strftime('%Y-%m-%d')
        recent = [t for t in congress if t.get('disclosure_date', '') >= cutoff]
        
        # Separate buys/sells
        buys = [t for t in recent if 'purchase' in t.get('transaction_type', '').lower()]
        sells = [t for t in recent if 'sale' in t.get('transaction_type', '').lower()]
        
        # Watchlist trades
        watchlist_trades = [t for t in recent 
                          if any(w.lower() in t.get('politician', '').lower() for w in WATCHLIST)]
        
        if watchlist_trades:
            lines.append("**WATCHLIST ALERTS**")
            for t in watchlist_trades[:5]:
                tx_type = "BUY" if 'purchase' in t.get('transaction_type', '').lower() else "SELL"
                lines.append(f"- {tx_type} {t.get('ticker')} - {t.get('politician')}")
            lines.append("")
        
        if buys:
            lines.append("**Top Congress Buys**")
            # Only show trades with tickers
            buys_with_ticker = [t for t in buys if t.get('ticker')]
            for t in buys_with_ticker[:10]:
                star = "*" if any(w.lower() in t.get('politician', '').lower() for w in WATCHLIST) else ""
                amount = f"${t.get('amount_low', 0):,}-${t.get('amount_high', 0):,}"
                lines.append(f"- {star}**{t.get('ticker')}** - {t.get('politician', '')[:20]} ({amount})")
            lines.append("")
        
        if sells:
            lines.append("**Top Congress Sells**")
            sells_with_ticker = [t for t in sells if t.get('ticker')]
            for t in sells_with_ticker[:10]:
                star = "*" if any(w.lower() in t.get('politician', '').lower() for w in WATCHLIST) else ""
                amount = f"${t.get('amount_low', 0):,}-${t.get('amount_high', 0):,}"
                lines.append(f"- {star}**{t.get('ticker')}** - {t.get('politician', '')[:20]} ({amount})")
            lines.append("")
    else:
        lines.append("**Congress Trades**")
        lines.append("- No cached data. Run browser scrape to populate.")
        lines.append("")
    
    lines.append("---")
    lines.append("_* = Watchlist member_")
    
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    
    digest = generate_digest()
    print(digest)
    
    # Save to file
    out_path = Path(__file__).parent / "latest_digest.md"
    out_path.write_text(digest, encoding='utf-8')
    print(f"\nSaved to {out_path}")
