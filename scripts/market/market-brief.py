#!/usr/bin/env python3
"""
Market Brief - Fetch S&P 500 and market data
Uses free APIs with fallbacks
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

WATCHLIST = [
    ("SPY", "S&P 500 ETF"),
    ("QQQ", "NASDAQ ETF"),
    ("DIA", "Dow Jones ETF"),
    ("IWM", "Russell 2000"),
    ("VIX", "Volatility Index"),
]

def fetch_quote(symbol):
    """Fetch quote from Yahoo Finance API"""
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}"
    headers = {"User-Agent": "Mozilla/5.0"}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            result = data.get("quoteResponse", {}).get("result", [])
            if result:
                return result[0]
    except Exception as e:
        pass
    return None

def main():
    print(f"📊 **Market Brief** — {datetime.now().strftime('%Y-%m-%d %H:%M %Z')}")
    print("")
    
    alerts = []
    
    for symbol, name in WATCHLIST:
        quote = fetch_quote(symbol)
        
        if quote:
            price = quote.get("regularMarketPrice", 0)
            change = quote.get("regularMarketChange", 0)
            pct = quote.get("regularMarketChangePercent", 0)
            volume = quote.get("regularMarketVolume", 0)
            avg_volume = quote.get("averageDailyVolume10Day", 1)
            
            # Direction emoji
            if pct > 0:
                emoji = "🟢"
                sign = "+"
            elif pct < 0:
                emoji = "🔴"
                sign = ""
            else:
                emoji = "⚪"
                sign = ""
            
            print(f"{emoji} **{name}** ({symbol})")
            print(f"   ${price:,.2f} ({sign}{change:,.2f} / {sign}{pct:.2f}%)")
            
            # Volume check
            if avg_volume > 0:
                vol_ratio = volume / avg_volume
                if vol_ratio > 1.5:
                    print(f"   ⚠️ High volume: {vol_ratio:.1f}x average")
                    alerts.append(f"{symbol}: {vol_ratio:.1f}x volume")
            
            # Big move alert
            if abs(pct) >= 2.0:
                alerts.append(f"{symbol}: {sign}{pct:.2f}% move")
            
            print("")
        else:
            print(f"⚠️ {symbol}: Unable to fetch data")
            print("")
    
    if alerts:
        print("🚨 **Alerts:**")
        for alert in alerts:
            print(f"   • {alert}")
    else:
        print("✅ No unusual activity detected")

if __name__ == "__main__":
    main()
