#!/usr/bin/env python3
"""
Polymarket Market Scanner
Fetches active markets and identifies close-to-resolution opportunities.
"""

import json
import requests
from datetime import datetime, timezone
from typing import Optional

# Polymarket Gamma API (public, no auth needed)
GAMMA_API = "https://gamma-api.polymarket.com"

def fetch_markets(limit: int = 100, active: bool = True) -> list:
    """Fetch markets from Polymarket Gamma API."""
    params = {
        "limit": limit,
        "active": str(active).lower(),
        "closed": "false",
    }
    
    resp = requests.get(f"{GAMMA_API}/markets", params=params)
    resp.raise_for_status()
    return resp.json()

def parse_end_date(end_date_str: Optional[str]) -> Optional[datetime]:
    """Parse end date string to datetime."""
    if not end_date_str:
        return None
    try:
        return datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
    except:
        return None

def get_time_until_resolution(end_date: Optional[datetime]) -> tuple:
    """Get human-readable time until resolution and seconds remaining."""
    if not end_date:
        return "Unknown", float('inf')
    
    now = datetime.now(timezone.utc)
    diff = end_date - now
    total_seconds = diff.total_seconds()
    
    if total_seconds < 0:
        return "Ended", -1
    
    days = diff.days
    hours = diff.seconds // 3600
    
    if days > 30:
        return f"{days // 30}mo", total_seconds
    elif days > 0:
        return f"{days}d", total_seconds
    elif hours > 0:
        return f"{hours}h", total_seconds
    else:
        minutes = diff.seconds // 60
        return f"{minutes}m", total_seconds

def parse_outcomes_and_prices(market: dict) -> list:
    """Parse outcomes and prices from market data."""
    outcomes_str = market.get('outcomes', '[]')
    prices_str = market.get('outcomePrices', '[]')
    
    try:
        outcomes = json.loads(outcomes_str) if isinstance(outcomes_str, str) else outcomes_str
        prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
    except:
        return []
    
    result = []
    for i, outcome in enumerate(outcomes):
        price = float(prices[i]) if i < len(prices) else 0
        result.append({
            "name": outcome,
            "price": price,
            "implied_prob": f"{price * 100:.1f}%"
        })
    
    return result

def calculate_edge_score(prices: list) -> float:
    """
    Calculate edge score based on uncertainty.
    Bets closer to 50% have more uncertainty = more potential edge.
    """
    if not prices or len(prices) < 2:
        return 0
    
    # Get the highest probability outcome
    max_price = max(p['price'] for p in prices)
    
    # Edge score: higher when closer to 50/50
    deviation = abs(max_price - 0.5)
    edge_score = max(0, 1 - (deviation * 2))
    
    return edge_score

def scan_markets(limit: int = 50, sort_by: str = "ending_soon", 
                 max_days: int = 30, min_volume: float = 1000) -> list:
    """
    Scan markets and return ranked opportunities.
    
    Args:
        limit: Number of markets to return
        sort_by: "ending_soon", "volume", or "edge"
        max_days: Only show markets ending within this many days
        min_volume: Minimum trading volume
    """
    markets = fetch_markets(limit=limit * 3)  # Fetch extra to filter
    
    opportunities = []
    
    for market in markets:
        # Skip closed markets
        if market.get('closed'):
            continue
            
        end_date = parse_end_date(market.get('endDate'))
        time_left, seconds_left = get_time_until_resolution(end_date)
        
        # Skip if already ended or unknown
        if time_left in ["Ended", "Unknown"]:
            continue
        
        # Skip if too far out
        if seconds_left > max_days * 24 * 3600:
            continue
        
        # Parse prices
        prices = parse_outcomes_and_prices(market)
        if not prices:
            continue
        
        volume = float(market.get('volume', 0) or 0)
        
        # Skip low volume markets
        if volume < min_volume:
            continue
        
        edge_score = calculate_edge_score(prices)
        liquidity = float(market.get('liquidity', 0) or 0)
        
        opp = {
            "id": market.get('id'),
            "question": market.get('question', 'Unknown'),
            "category": market.get('category', 'Other'),
            "end_date": end_date.isoformat() if end_date else None,
            "seconds_left": seconds_left,
            "time_left": time_left,
            "volume": volume,
            "liquidity": liquidity,
            "edge_score": edge_score,
            "prices": prices,
            "slug": market.get('slug', ''),
            "url": f"https://polymarket.com/event/{market.get('slug', '')}",
        }
        
        opportunities.append(opp)
    
    # Sort based on preference
    if sort_by == "ending_soon":
        opportunities.sort(key=lambda x: x.get('seconds_left', float('inf')))
    elif sort_by == "volume":
        opportunities.sort(key=lambda x: x['volume'], reverse=True)
    elif sort_by == "edge":
        opportunities.sort(key=lambda x: x['edge_score'], reverse=True)
    
    return opportunities[:limit]

def print_opportunities(opportunities: list):
    """Pretty print opportunities."""
    print(f"\n{'='*80}")
    print(f"POLYMARKET OPPORTUNITIES ({len(opportunities)} markets)")
    print(f"{'='*80}\n")
    
    for i, opp in enumerate(opportunities, 1):
        question = opp['question']
        if len(question) > 65:
            question = question[:62] + "..."
        
        print(f"{i}. {question}")
        print(f"   ⏰ Ends: {opp['time_left']} | 📊 Vol: ${opp['volume']:,.0f} | 💧 Liq: ${opp['liquidity']:,.0f}")
        
        for price in opp['prices'][:2]:
            bar_len = int(price['price'] * 20)
            bar = '█' * bar_len + '░' * (20 - bar_len)
            print(f"   {price['name']:10} {bar} {price['implied_prob']}")
        
        print(f"   🎯 Edge: {opp['edge_score']:.2f} | 🔗 {opp['url']}")
        print()

def save_opportunities(opportunities: list, filepath: str):
    """Save opportunities to JSON file."""
    with open(filepath, 'w') as f:
        json.dump(opportunities, f, indent=2, default=str)
    print(f"Saved {len(opportunities)} opportunities to {filepath}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Scan Polymarket for betting opportunities")
    parser.add_argument("--limit", type=int, default=15, help="Number of markets to show")
    parser.add_argument("--sort", choices=["ending_soon", "volume", "edge"], default="ending_soon")
    parser.add_argument("--max-days", type=int, default=30, help="Max days until resolution")
    parser.add_argument("--min-volume", type=float, default=1000, help="Min trading volume")
    parser.add_argument("--output", type=str, help="Save to JSON file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    print("🔍 Scanning Polymarket...")
    opportunities = scan_markets(
        limit=args.limit, 
        sort_by=args.sort,
        max_days=args.max_days,
        min_volume=args.min_volume
    )
    
    if args.output:
        save_opportunities(opportunities, args.output)
    elif args.json:
        print(json.dumps(opportunities, indent=2, default=str))
    else:
        print_opportunities(opportunities)
        print(f"💡 Tip: Use --sort edge to find uncertain markets with potential edge")
